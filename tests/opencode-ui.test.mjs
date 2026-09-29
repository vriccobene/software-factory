import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, chmod, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function request(port, path, method = 'GET', body) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}

test('local UI keeps an approved run and uses an isolated worktree', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'factory-ui-'));
  const repo = join(temp, 'product');
  const dataDir = join(temp, 'store');
  await mkdir(join(repo, 'factory'), { recursive: true });
  await writeFile(join(repo, 'README.md'), '# Product\n');
  for (const name of ['setup', 'verify']) { const path = join(repo, 'factory', name); await writeFile(path, '#!/bin/sh\nexit 0\n'); await chmod(path, 0o755); }
  execFileSync('git', ['init', '-q', repo]);
  execFileSync('git', ['-C', repo, 'add', '.']);
  execFileSync('git', ['-C', repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'baseline']);
  let pendingQuestion = false;
  let resolveQuestion;
  let receivedAnswers;
  const fake = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/global/health') res.end(JSON.stringify({ healthy: true }));
    else if (req.url === '/session' && req.method === 'POST') res.end(JSON.stringify({ id: 'ses_test' }));
    else if (req.url === '/session/ses_test/command') {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (input.arguments.startsWith('ABC-Q')) { pendingQuestion = true; await new Promise(resolve => { resolveQuestion = resolve; }); }
      else await sleep(200);
      res.end(JSON.stringify({ info: { role: 'assistant' }, parts: [] }));
    }
    else if (req.url === '/question' && req.method === 'GET') res.end(JSON.stringify(pendingQuestion ? [{ id: 'que_test', sessionID: 'ses_test', questions: [{ question: 'Which color?', header: 'Color', options: [{ label: 'Green', description: 'Use green' }] }] }] : []));
    else if (req.url === '/question/que_test/reply' && req.method === 'POST') { const chunks = []; for await (const chunk of req) chunks.push(chunk); receivedAnswers = JSON.parse(Buffer.concat(chunks).toString('utf8')).answers; pendingQuestion = false; resolveQuestion(); res.end('true'); }
    else if (req.url === '/session/ses_test/message?limit=200') res.end(JSON.stringify([]));
    else if (req.url === '/session/ses_test/children' || req.url === '/session/ses_test/diff') res.end('[]');
    else if (req.url === '/session/status') res.end('{}');
    else { res.statusCode = 404; res.end('{}'); }
  });
  await new Promise(resolve => fake.listen(0, '127.0.0.1', resolve));
  const port = await freePort();
  const child = spawn(process.execPath, [resolve('src/opencode-ui/server.mjs')], { env: { ...process.env, OPENCODE_UI_PORT: String(port), OPENCODE_URL: `http://127.0.0.1:${fake.address().port}`, OPENCODE_UI_DATA_DIR: dataDir }, stdio: 'ignore' });
  try {
    let ready = false;
    for (let n = 0; n < 40; n++) { try { const response = await request(port, '/api/bootstrap'); if (response.status === 200) { ready = true; break; } } catch { await sleep(50); } }
    assert.equal(ready, true);
    const folders = await request(port, `/api/folders?path=${encodeURIComponent(temp)}`);
    assert.equal(folders.status, 200);
    assert.ok(folders.data.folders.includes('product'));
    const project = await request(port, '/api/projects', 'POST', { path: repo });
    assert.equal(project.status, 201);
    assert.equal(project.data.ready, true);
    const invalid = await request(port, '/api/runs', 'POST', { projectId: project.data.id, identifier: 'ABC-1', title: 'Test', pdr: '# PDR' });
    assert.equal(invalid.status, 422);
    const created = await request(port, '/api/runs', 'POST', { projectId: project.data.id, identifier: 'ABC-1', title: 'Test', pdr: '# PDR', approved: true });
    assert.equal(created.status, 201);
    let run;
    for (let n = 0; n < 40; n++) { run = (await request(port, `/api/runs/${created.data.id}`)).data; if (run.state === 'finished') break; await sleep(100); }
    assert.equal(run.state, 'finished');
    assert.equal(run.sessionId, 'ses_test');
    assert.equal(run.pdr, '# PDR');
    assert.equal((await readFile(join(run.workspace, 'README.md'), 'utf8')).trim(), '# Product');
    assert.equal((await request(port, '/api/bootstrap')).data.runs.length, 1);
    assert.equal((await request(port, '/api/settings', 'POST', { parallelLimit: 2 })).data.parallelLimit, 2);
    assert.equal((await request(port, '/api/bootstrap')).data.parallelLimit, 2);
    const payload = { projectId: project.data.id, identifier: 'ABC-2', title: 'Parallel test', pdr: '# PDR', approved: true };
    const second = await request(port, '/api/runs', 'POST', payload);
    const third = await request(port, '/api/runs', 'POST', { ...payload, identifier: 'ABC-3' });
    assert.equal(second.status, 201);
    assert.equal(third.status, 201);
    assert.equal((await request(port, '/api/runs', 'POST', { ...payload, identifier: 'ABC-4' })).status, 409);
    let parallel;
    for (let n = 0; n < 40; n++) {
      parallel = (await request(port, '/api/bootstrap')).data.runs.filter(item => [second.data.id, third.data.id].includes(item.id));
      if (parallel.every(item => item.state === 'finished')) break;
      await sleep(100);
    }
    assert.equal(parallel.length, 2);
    assert.ok(parallel.every(item => item.state === 'finished'));
    assert.notEqual(parallel[0].workspace, parallel[1].workspace);
    const questioned = await request(port, '/api/runs', 'POST', { ...payload, identifier: 'ABC-Q' });
    assert.equal(questioned.status, 201);
    let pending;
    for (let n = 0; n < 40; n++) {
      pending = (await request(port, `/api/runs/${questioned.data.id}`)).data;
      if (pending.questions?.length) break;
      await sleep(100);
    }
    assert.equal(pending.state, 'waiting');
    assert.equal(pending.questions[0].questions[0].question, 'Which color?');
    assert.equal((await request(port, `/api/runs/${questioned.data.id}/answer`, 'POST', { requestId: 'que_test', answers: [['Green']] })).status, 202);
    assert.deepEqual(receivedAnswers, [['Green']]);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
    await new Promise(resolve => fake.close(resolve));
    await rm(temp, { recursive: true, force: true });
  }
});
