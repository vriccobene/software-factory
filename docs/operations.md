# Operations

## Runtime

Docker Compose starts PostgreSQL, the API, and one worker. The CLI is an on-demand Compose profile.
The worker starts an additional hardened container for every role through the host Docker socket.

The complete setup and run procedure is maintained in the [README](../README.md#setup-step-by-step).
Always use `./bin/factory-preflight` before startup. The wrappers derive the Docker socket GID at
runtime, so an accidentally exported or stale `DOCKER_GID` cannot configure the worker incorrectly.

## Run operations

Add the repository's absolute `bin` directory to `PATH`, or prefix commands with `./bin/`. Start an
approved Linear issue using its stable identifier; `bikelyo` is the script's default product:

```bash
factory-start BIK-123
```

The returned UUID is the factory run identifier, not the Linear identifier. Use the CLI for normal
operations instead of querying PostgreSQL:

```bash
factory-list
factory-list --all --limit 20
factory-list --status PAUSED_QUOTA
factory-status RUN_UUID
factory-watch RUN_UUID 2
```

`list` defaults to the active states `QUEUED`, `PREPARING`, `RUNNING`, and `PAUSED_QUOTA`. Exact
state filters are case-insensitive in the CLI. `watch` prints only changes and exits on `SUCCEEDED`
or `FAILED`; Ctrl-C stops watching but does not stop the worker or run. Diagnose the worker with:

The wrapper scripts execute `dist/cli/main.js` inside the already-running API container. Routine
commands therefore create no disposable CLI container. Start the stack with `factory-up` first; a
stopped API produces an explicit Compose service-not-running error.

```bash
docker compose ps
factory-logs
```

## Secrets

`.env` is the local secret store and is ignored by Git. It contains:

- `LINEAR_API_KEY` for read-only issue queries;
- `OPENAI_API_KEY` for API key mode only;
- `GITHUB_APP_ID` and `GITHUB_APP_INSTALLATION_ID`, which identify the repository-scoped App;
- `GITHUB_APP_PRIVATE_KEY_PATH`, the host path mounted as a worker-only Docker secret;
- `PROTECTED_BRANCHES`, a comma-separated denylist with `main,staging,dev` as its safe default;
- `QUOTA_MAX_ATTEMPTS`, the maximum automatic quota resumptions, defaulting to `8`;
- local Docker, database, and port settings.

The worker signs a short-lived App JWT and exchanges it for a fresh installation token before clone
and again before push, requesting only Contents write and Metadata read. Only each Git subprocess
receives its installation token through `GIT_ASKPASS`; unrelated worker secrets, role containers,
and lifecycle containers receive neither the PEM nor a GitHub token. PDR text, logs, and evidence
must never contain credentials. In API key mode, the OpenAI key is forwarded to role containers.
In ChatGPT mode, the worker imports the official Codex login cache from a Compose secret into
`workspaces/.codex-auth`, which is ignored by Git and accessible only to Codex role containers.
The cache is writable so Codex can persist token refreshes; treat it as a password. Use
`factory-up-chatgpt` after a new host login to import a newer cache. This mode does not forward
`OPENAI_API_KEY` to roles. Credential proxying is not implemented.

Local Compose file secrets retain their host ownership. The worker entrypoint therefore starts as
root only long enough to copy the mounted PEM to an internal `0600` file owned by UID 10001, then
uses `setpriv` to execute the worker as UID/GID 10001. It retains the supplementary Docker socket
group configured by `DOCKER_GID`; the Node worker itself never runs as root.

Lifecycle containers receive none of these factory environment variables. Network and Docker access
are independent, fail-closed product capabilities. Docker access mounts the host daemon socket and
is therefore equivalent to host-level authority for the trusted hook.

## Persistence and recovery

PostgreSQL data lives in the `factory-db` Compose volume. Checkouts live in the host `workspaces/`
directory, while successful results are also durable on their remote review branches. Ordinary
`docker compose down` and restart preserve local state.

Quota-limited runs enter `PAUSED_QUOTA`; no agent container is kept alive. PostgreSQL stores their
checkpoint and `resumeAt`, and the worker later reclaims the same run and workspace. Completed setup
and roles are skipped. A role interrupted mid-execution starts a fresh provider session against the
existing Git workspace unless that provider adapter supplies a continuation token. After the
configured attempt limit, the run fails. Runs unexpectedly interrupted in `PREPARING` or `RUNNING`
still become `FAILED` on worker restart.

## Current limits

- Codex is the only implemented coding provider.
- Network access is Docker bridge access, not a destination allowlist.
- Target repositories must implement the two-hook [project contract](project-contract.md).
- Evidence is byte-bounded and may be truncated.
- One worker processes runs sequentially.
- The factory's only GitHub write is a non-force push to the validated Linear-derived branch after
  all verification gates pass. It does not create pull requests or modify protected branches.
