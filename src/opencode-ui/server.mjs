import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, stat, realpath, rename, chmod, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const storeDir = process.env.OPENCODE_UI_DATA_DIR || join(root, '.opencode-ui-data');
const storePath = join(storeDir, 'state.json');
const port = Number(process.env.OPENCODE_UI_PORT || 4173);
const openCodeBase = process.env.OPENCODE_URL || 'http://127.0.0.1:4096';
const active = new Set();
const execFileAsync = promisify(execFile);
let state = { projects: [], runs: [], parallelLimit: 1 };
try {
  state = JSON.parse(await readFile(storePath, 'utf8'));
  state.parallelLimit = Number.isInteger(state.parallelLimit) && state.parallelLimit >= 1 && state.parallelLimit <= 4 ? state.parallelLimit : 1;
  for (const run of state.runs) {
    if (['starting', 'running', 'waiting'].includes(run.state)) {
      run.state = 'interrupted';
      run.error = 'The UI restarted. Inspect this OpenCode session before continuing.';
    }
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const required = (value, name, limit = 100000) => {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new HttpError(422, `Invalid ${name}`);
  return value.trim();
};
async function save() {
  await mkdir(storeDir, { recursive: true, mode: 0o700 });
  await chmod(storeDir, 0o700);
  const temp = join(storeDir, `${randomUUID()}.tmp`);
  await writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await rename(temp, storePath);
}
await save();
async function jsonBody(req) {
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 1_000_000) throw new HttpError(413, 'Request exceeds 1 MB');
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new HttpError(400, 'Expected a JSON object'); }
}
function reply(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(value));
}
async function opencode(path, options = {}) {
  const base = new URL(openCodeBase);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new HttpError(500, 'OpenCode must be on loopback');
  const headers = { 'content-type': 'application/json' };
  if (process.env.OPENCODE_SERVER_PASSWORD) {
    const user = process.env.OPENCODE_SERVER_USERNAME || 'opencode';
    headers.authorization = `Basic ${Buffer.from(`${user}:${process.env.OPENCODE_SERVER_PASSWORD}`).toString('base64')}`;
  }
  let result;
  try { result = await fetch(new URL(path, base), { ...options, headers, redirect: 'error', signal: AbortSignal.timeout(options.timeout || 10000) }); }
  catch { throw new HttpError(502, 'OpenCode is unavailable'); }
  if (!result.ok) throw new HttpError(502, `OpenCode returned ${result.status}`);
  return result.status === 204 ? null : result.json();
}
function summary(run) { const { pdr, evidence, ...result } = run; return result; }
async function workspaceChanges(run) {
  if (!run.workspace) return { status: '', diff: '' };
  try {
    const status = (await execFileAsync('git', ['-C', run.workspace, 'status', '--short', '--untracked-files=all'], { maxBuffer: 500000 })).stdout;
    let diff = (await execFileAsync('git', ['-C', run.workspace, 'diff', '--no-ext-diff', 'HEAD', '--'], { maxBuffer: 500000 })).stdout;
    for (const line of status.split('\n').filter(line => line.startsWith('?? ')).slice(0, 30)) {
      const file = line.slice(3);
      try {
        const content = await readFile(join(run.workspace, file), 'utf8');
        diff += `\n--- /dev/null\n+++ b/${file}\n` + content.slice(0, 30000).split('\n').map(value => `+${value}`).join('\n');
      } catch { diff += `\nUntracked file: ${file} (binary or unreadable)\n`; }
    }
    return { status: status.slice(0, 30000), diff: diff.slice(0, 400000) };
  } catch { return { status: 'Workspace diff unavailable', diff: '' }; }
}
async function launch(run) {
  active.add(run.id);
  try {
    const session = await opencode('/session', { method: 'POST', body: JSON.stringify({ title: `${run.identifier} · ${run.title}` }) });
    if (!session?.id) throw new Error('OpenCode did not return a session ID');
    run.sessionId = session.id; run.state = 'running'; await save();
    const project = state.projects.find(p => p.id === run.projectId);
    const workspace = join(storeDir, 'workspaces', run.id);
    await mkdir(dirname(workspace), { recursive: true, mode: 0o700 });
    await execFileAsync('git', ['-C', project.path, 'worktree', 'add', '--detach', workspace, 'HEAD']);
    run.workspace = workspace;
    await save();
    const pdrPath = join(storeDir, `${run.id}.md`);
    await writeFile(pdrPath, run.pdr, { mode: 0o600 });
    const args = `${run.identifier}; approved PDR snapshot: ${pdrPath}; trusted isolated product checkout: ${workspace}. Read the snapshot, use the trusted checkout, and ask the Product Owner when a decision is required.`;
    await opencode(`/session/${encodeURIComponent(session.id)}/command`, { method: 'POST', body: JSON.stringify({ command: 'factory-run', arguments: args, agent: 'build' }), timeout: 12 * 60 * 60 * 1000 });
    if (run.state !== 'stopped') run.state = 'finished';
  } catch (error) {
    if (run.state !== 'stopped') { run.state = 'failed'; run.error = error.message; }
  } finally {
    if (run.sessionId) {
      try {
        const id = encodeURIComponent(run.sessionId);
        const [messages, children, diff] = await Promise.all([opencode(`/session/${id}/message?limit=200`), opencode(`/session/${id}/children`), opencode(`/session/${id}/diff`)]);
        if (JSON.stringify({ messages, children, diff }).length < 500000) run.evidence = { messages, children, diff, childMessages: [] };
      } catch { /* The run still ends when OpenCode evidence is unavailable. */ }
    }
    run.endedAt = new Date().toISOString(); active.delete(run.id); await save();
  }
}
async function route(req, res) {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  if (req.method !== 'GET' && req.headers.origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin)) throw new HttpError(403, 'Cross-origin request rejected');
  if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
    let connected = false;
    try { await opencode('/global/health', { timeout: 1000 }); connected = true; } catch { /* Offline is a UI state. */ }
    reply(res, 200, { projects: state.projects, runs: state.runs.map(summary), parallelLimit: state.parallelLimit, connected }); return;
  }
  if (req.method === 'GET' && url.pathname === '/api/folders') {
    const input = url.searchParams.get('path') || process.cwd();
    const path = await realpath(input).catch(() => { throw new HttpError(404, 'Folder not found'); });
    const entries = await readdir(path, { withFileTypes: true });
    reply(res, 200, { path, parent: dirname(path), folders: entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.')).map(entry => entry.name).sort().slice(0, 200) }); return;
  }
  if (req.method === 'POST' && url.pathname === '/api/projects') {
    const input = await jsonBody(req);
    const path = await realpath(required(input.path, 'project path', 4096)).catch(() => { throw new HttpError(422, 'Project folder not found'); });
    if (!(await stat(path)).isDirectory()) throw new HttpError(422, 'Project path is not a folder');
    const issues = [];
    if (!existsSync(join(path, '.git'))) issues.push('Git checkout is missing');
    for (const hook of ['setup', 'verify']) {
      try { const file = await stat(join(path, 'factory', hook)); if (!file.isFile() || !(file.mode & 0o111)) issues.push(`factory/${hook} is not executable`); }
      catch { issues.push(`factory/${hook} is missing`); }
    }
    const previous = state.projects.find(p => p.path === path);
    const project = previous || { id: randomUUID(), path, name: path.split('/').pop() || path, createdAt: new Date().toISOString() };
    project.issues = issues; project.ready = issues.length === 0;
    if (!previous) state.projects.push(project);
    await save(); reply(res, 201, project); return;
  }
  if (req.method === 'POST' && url.pathname === '/api/settings') {
    const input = await jsonBody(req);
    const limit = input.parallelLimit;
    if (!Number.isInteger(limit) || limit < 1 || limit > 4) throw new HttpError(422, 'Parallel limit must be 1–4');
    state.parallelLimit = limit; await save(); reply(res, 200, { parallelLimit: limit }); return;
  }
  if (req.method === 'POST' && url.pathname === '/api/runs') {
    if (active.size + state.runs.filter(run => run.state === 'interrupted').length >= state.parallelLimit) throw new HttpError(409, 'Active or interrupted run limit reached; resolve the interrupted session first');
    const input = await jsonBody(req);
    const project = state.projects.find(p => p.id === input.projectId);
    if (!project || !project.ready) throw new HttpError(422, 'Choose a configured project');
    if (input.approved !== true) throw new HttpError(422, 'Confirm PDR approval');
    const identifier = required(input.identifier, 'identifier', 80);
    if (!/^[a-z][a-z0-9_-]*$/i.test(identifier)) throw new HttpError(422, 'Invalid identifier');
    let pdr = typeof input.pdr === 'string' ? input.pdr.trim() : '';
    if (input.pdrPath) {
      const path = await realpath(required(input.pdrPath, 'PDR path', 4096)).catch(() => { throw new HttpError(422, 'PDR file not found'); });
      const file = await stat(path);
      if (!file.isFile() || file.size > 1_000_000) throw new HttpError(422, 'PDR file must be at most 1 MB');
      pdr = await readFile(path, 'utf8');
    }
    pdr = required(pdr, 'PDR', 1_000_000);
    const run = { id: randomUUID(), projectId: project.id, identifier, title: required(input.title, 'title', 200), pdr, state: 'starting', startedAt: new Date().toISOString() };
    state.runs.unshift(run); await save(); void launch(run); reply(res, 201, summary(run)); return;
  }
  const match = url.pathname.match(/^\/api\/runs\/([0-9a-f-]{36})(?:\/(stop|answer|permission))?$/);
  if (match) {
    const run = state.runs.find(r => r.id === match[1]);
    if (!run) throw new HttpError(404, 'Run not found');
    const path = `/session/${encodeURIComponent(run.sessionId || '')}`;
    if (req.method === 'GET' && !match[2]) {
      let messages = run.evidence?.messages || [], children = run.evidence?.children || [], diff = run.evidence?.diff || [], childMessages = run.evidence?.childMessages || [], status = null, questions = null, permissions = null;
      if (run.sessionId) {
        try { [messages, children, diff, status] = await Promise.all([opencode(`${path}/message?limit=200`), opencode(`${path}/children`), opencode(`${path}/diff`), opencode('/session/status')]); }
        catch { /* Stored history remains available. */ }
        if (Array.isArray(children)) childMessages = await Promise.all(children.slice(0, 20).map(async child => { try { return { id: child.id, title: child.title, messages: await opencode(`/session/${encodeURIComponent(child.id)}/message?limit=200`) }; } catch { return { id: child.id, title: child.title, messages: [] }; } }));
        if (JSON.stringify({ messages, children, diff, childMessages }).length < 500000) { run.evidence = { messages, children, diff, childMessages }; await save(); }
      }
      if (run.sessionId && ['running', 'waiting'].includes(run.state)) {
        try {
          const pending = await opencode('/question');
          if (Array.isArray(pending)) {
            const ids = new Set([run.sessionId, ...children.map(child => child.id)]);
            questions = pending.filter(item => ids.has(item.sessionID));
            if (questions.length && run.state !== 'waiting') { run.state = 'waiting'; await save(); }
            else if (!questions.length && run.state === 'waiting') { run.state = 'running'; await save(); }
          }
        } catch { /* This OpenCode version may not expose question routes. */ }
      }
      if (run.sessionId && ['running', 'waiting'].includes(run.state)) {
        try { const pending = await opencode('/permission'); const ids = new Set([run.sessionId, ...children.map(child => child.id)]); permissions = Array.isArray(pending) ? pending.filter(item => ids.has(item.sessionID)) : []; } catch { /* Permission route varies by version. */ }
      }
      reply(res, 200, { ...run, messages, children, diff, childMessages, status, questions, permissions, workspaceChanges: await workspaceChanges(run) }); return;
    }
    if (req.method === 'POST' && match[2] === 'stop') {
      if (!run.sessionId || !['running', 'waiting', 'interrupted'].includes(run.state)) throw new HttpError(409, 'Run is not active');
      await opencode(`${path}/abort`, { method: 'POST', body: '{}' });
      run.state = 'stopped'; run.endedAt = new Date().toISOString(); await save(); reply(res, 200, summary(run)); return;
    }
    if (req.method === 'POST' && match[2] === 'permission') {
      if (!run.sessionId || !['running', 'waiting'].includes(run.state)) throw new HttpError(409, 'Run is not active');
      const input = await jsonBody(req);
      const requestId = required(input.requestId, 'permission ID', 100);
      if (!['once', 'reject'].includes(input.reply)) throw new HttpError(422, 'Choose allow once or reject');
      const pending = await opencode('/permission');
      const children = await opencode(`${path}/children`);
      const ids = new Set([run.sessionId, ...(Array.isArray(children) ? children.map(child => child.id) : [])]);
      if (!Array.isArray(pending) || !pending.some(item => item.id === requestId && ids.has(item.sessionID))) throw new HttpError(404, 'Pending permission not found for this run');
      await opencode(`/permission/${encodeURIComponent(requestId)}/reply`, { method: 'POST', body: JSON.stringify({ reply: input.reply }) });
      reply(res, 202, { sent: true }); return;
    }
    if (req.method === 'POST' && match[2] === 'answer') {
      if (!run.sessionId || !['running', 'waiting'].includes(run.state)) throw new HttpError(409, 'Run is not active');
      const input = await jsonBody(req);
      const requestId = required(input.requestId, 'question ID', 100);
      const pending = await opencode('/question');
      const children = await opencode(`${path}/children`);
      const ids = new Set([run.sessionId, ...(Array.isArray(children) ? children.map(child => child.id) : [])]);
      const question = Array.isArray(pending) && pending.find(item => item.id === requestId && ids.has(item.sessionID));
      if (!question) throw new HttpError(404, 'Pending question not found for this run');
      if (!Array.isArray(input.answers) || input.answers.length !== question.questions.length || input.answers.some(group => !Array.isArray(group) || !group.length || group.some(answer => typeof answer !== 'string' || !answer.trim() || answer.length > 5000))) throw new HttpError(422, 'One answer is required for each question');
      await opencode(`/question/${encodeURIComponent(requestId)}/reply`, { method: 'POST', body: JSON.stringify({ answers: input.answers }) });
      run.state = 'running'; await save(); reply(res, 202, { sent: true }); return;
    }
  }
  if (req.method === 'GET' && ['/', '/app.js', '/style.css'].includes(url.pathname)) {
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = await readFile(join(root, 'src/opencode-ui/public', name));
    res.writeHead(200, { 'content-type': name.endsWith('.css') ? 'text/css; charset=utf-8' : name.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff' });
    res.end(file); return;
  }
  throw new HttpError(404, 'Not found');
}
createServer((req, res) => { void route(req, res).catch(error => reply(res, error.status || 500, { error: error.message || 'Unknown error' })); }).listen(port, '127.0.0.1', () => console.log(`OpenCode Factory UI: http://127.0.0.1:${port}`));
