# Software Factory

Software Factory is a small, supervised launcher that turns an approved Linear PDR into a verified
commit on a dedicated review branch. It stores the PDR snapshot and run state in PostgreSQL, lets Codex
select the relevant specialist roles, and runs every selected role in a hardened Docker container
with explicit filesystem visibility and write permissions.

The Product Owner remains present for questions and owns every product decision. The factory does
not create pull requests, modify Linear, deploy, release, force-push, or push protected branches.

## What is implemented

- Resolve a Linear issue by stable identifier or exact title and store an immutable snapshot.
- Select relevant roles from the complete eleven-role roster; always finish with `verifier`.
- Design operational signals through `observability-builder` and, when the product already has an
  observability system, instrument changed production behavior without choosing a new vendor or backend.
- Clone the repository and base branch declared in trusted local configuration, then create a
  Linear-derived working branch (`username/identifier-title`, lowercase kebab case).
- Give each role only its configured absent, read-only, or read-write repository paths.
- Run the repository's fixed `factory/setup` and `factory/verify` lifecycle hooks.
- Run Codex non-interactively and retain bounded role events, Git status, and the final diff.
- Persist run state across ordinary API and worker restarts.
- Start and inspect runs through a small CLI and HTTP API.

Codex is the only provider currently implemented. Claude Code is the next provider and will be
tested with a different PDR, not by repeating the Codex PDR.

To verify ChatGPT-authenticated Codex, first run `codex login` on the host, then run:

```bash
./bin/codex-chatgpt-auth-test
```

The test uses a disposable container with no workspace, Docker socket, GitHub secret, or API key;
it mounts the Codex login directory read-only and expects `CODEX_CHATGPT_AUTH_PASS`.

## Prerequisites

- Docker Engine with Docker Compose v2
- Either an OpenAI API project with API billing or a Codex CLI login through ChatGPT
- A Linear workspace containing the PDR
- Read and branch-push access to the target Git repository

Node.js 22 is needed only for running the development checks outside Docker.

## Setup: step by step

Run every command below from the repository root:

```bash
cd /home/vince/projects/bikelyo/software-factory
```

### 1. Create the local configuration files

Copy the committed templates once:

```bash
cp .env.example .env
cp factory.example.yaml factory.yaml
```

Both generated files are ignored by Git. Do not commit `.env`; it contains credentials. If either
file already exists, edit it instead of overwriting it.

### 2. Choose Codex authentication

The default `execution.auth: api-key` uses separate OpenAI API billing. For this mode:

1. Open the [OpenAI API keys page](https://platform.openai.com/api-keys).
2. Select or create the project that should pay for factory runs.
3. Create a project API key and copy it immediately.
4. Confirm that API billing or credits are available for that project.
5. Put the value in `.env`:

   ```dotenv
   OPENAI_API_KEY=sk-your-real-key
   ```

Use an API project key, not a ChatGPT subscription credential or an organization admin key.

To use a ChatGPT plan instead, set `execution.auth: chatgpt` in `factory.yaml`, run `codex login`
on the host, and confirm `codex login status` reports ChatGPT. Run
`./bin/codex-chatgpt-auth-test` before starting the factory. The factory reads the documented
Codex login cache at `${HOME}/.codex/auth.json` by default. If it is elsewhere, set
`CODEX_AUTH_SOURCE_FILE` to its absolute path when running `factory-up-chatgpt`. The cache contains
access tokens; keep it private and do not commit it. [OpenAI Codex authentication](https://learn.chatgpt.com/docs/auth)

The worker copies the login cache into a dedicated ignored directory under `workspaces/`. Codex
role containers can refresh that cache during runs. Only those role containers receive the cache;
the API key is not forwarded in ChatGPT mode. A role can read this credential while it runs, so use
only trusted PDRs and role instructions. If you log in again on the host, restart with
`factory-up-chatgpt` to import the newer cache.

### 3. Create the Linear API key

1. In Linear, open **Settings → Account → Security & access → Personal API keys**.
2. Create a personal API key for this local factory.
3. Restrict it to the relevant workspace or teams when Linear offers those controls.
4. Put the value in `.env`:

   ```dotenv
   LINEAR_API_KEY=lin_api_your-real-key
   ```

The current integration only sends GraphQL queries; it does not write to Linear. See the
[Linear API documentation](https://linear.app/docs/api-and-webhooks) for key management details.

### 4. Configure the GitHub App

For the separate interactive client that replaces `gh`, see
[GitHub App access](docs/github-app-access.md). Its additional App permissions and
human-only merge rules do not change the automated worker's narrower token request.

Use a dedicated GitHub App rather than a personal access token. Install it only on the target
repository with **Contents: Read and write**, **Metadata: Read-only**, and no Pull requests, Issues,
Actions, Administration, or organization permissions.

1. Open the App settings page and copy its numeric **App ID**.
2. Under **Private keys**, generate and download one PEM private key.
3. Install the App on only the target repository.
4. Open the installed App configuration. The final numeric segment of its URL is the installation
   ID, for example `/settings/installations/987654`.
5. Store the PEM outside version control and restrict its host permissions:

   ```bash
   mkdir -p secrets
   mv /path/to/downloaded-app-key.pem secrets/github-app.pem
   chmod 600 secrets/github-app.pem
   ```

6. Put only the identifiers and local key path in `.env`:

   ```dotenv
   GITHUB_APP_ID=123456
   GITHUB_APP_INSTALLATION_ID=987654
   GITHUB_APP_PRIVATE_KEY_PATH=./secrets/github-app.pem
   ```

The `secrets/` directory is ignored by Git. Docker mounts the PEM only into the trusted worker. The
worker signs a short-lived App JWT and exchanges it for a fresh installation token separately for
clone and push, explicitly requesting only Contents write and Metadata read. Neither the PEM nor
installation tokens are forwarded to role containers, stored in PostgreSQL, or included in
evidence. Use an HTTPS clone URL in `factory.yaml`.

Configure the exact branch names that the factory must never push in `.env`:

```dotenv
PROTECTED_BRANCHES=main,staging,dev
```

Names are comma-separated and case-insensitive. The factory validates the generated destination
immediately before publishing, uses an explicit `HEAD:refs/heads/<linear-branch>` refspec, and never
force-pushes. Add release or production branch names whenever the repository introduces them.

### 5. Configure Docker socket access

Find the group ID of the local Docker socket:

```bash
stat -c '%g' /var/run/docker.sock
```

Copy the printed number into `.env`:

```dotenv
DOCKER_GID=65534
```

The trusted worker needs the Docker socket to start role containers. Role containers do not receive
the socket.

Choose a local PostgreSQL password and, optionally, a different API port:

```dotenv
POSTGRES_PASSWORD=replace-with-a-local-password
FACTORY_PORT=8080
```

### 6. Configure the product repository and path boundaries

Edit `factory.yaml`. Replace the example repository URL and branch, then map the repository's real
paths into the eight path groups:

```yaml
products:
  my-product:
    repository:
      url: https://github.com/my-organization/my-product.git
      baseBranch: main
    paths:
      repository: [package.json, tsconfig.json]
      contracts: [contracts]
      backend: [src/backend]
      frontend: [src/frontend]
      tests: [tests/backend]
      ui-tests: [tests/ui]
      infrastructure: [.github, docker]
      documentation: [README.md, docs]
    lifecycle:
      setup:
        network: true
        docker: false
        timeoutSeconds: 900
      verify:
        network: false
        docker: false
        timeoutSeconds: 1800
execution:
  auth: api-key
  model: gpt-5-codex
  image: software-factory-worker:latest
  timeoutSeconds: 1800
  maxEvidenceBytes: 200000
  roleSkills:
    backend-builder: [test-driven-development, debugging-and-error-recovery]
    ui-builder: [frontend-ui-engineering, design-taste-frontend, impeccable, awesome-design-md, browser-testing-with-devtools]
    observability-builder: [observability-and-instrumentation]
    verifier: [code-review-and-quality]
  roleModels:
    backend-builder: gpt-6-astra
    ui-builder: gpt-6-astra
    observability-builder: gpt-6-astra
    verifier: gpt-6-astra
  browser:
    enabled: true
    image: mcr.microsoft.com/playwright/mcp@sha256:76c66ac16cb6703bc13a6c23f925da28f53a4000bd3c7781a21b1da60b4cdbe8
    allowedOrigins: ["http://host.docker.internal:*"]
```

`roleSkills` and `roleModels` are optional per-role overrides. Skills must exist under
`.agents/skills/<skill-name>/SKILL.md`; only a role's assigned skill directories are mounted into
its container, read-only. A missing model override falls back to `execution.model`. See
[Role skills and models](docs/role-skills-and-models.md).

The three additional UI design skills are locally hardened, version-pinned, instruction-only
profiles. They contain no executable launcher and do not authorize package installation, network
asset retrieval, image generation, or paid services. They are assigned only to `ui-builder`.

When `browser.enabled` is true, only `ui-builder` and `ui-test-writer` receive a per-role Playwright
MCP sidecar. The sidecar has an ephemeral profile, no host port, no Docker socket, and is removed
after the role exits. `allowedOrigins` is a Playwright guardrail, not a complete redirect security
boundary. See [Browser sidecars](docs/browser-sidecars.md).

Rules for these paths:

- Paths are literal files or directories relative to the target repository root; globs are not
  supported.
- Use an empty list (`[]`) when a group does not exist.
- Do not assign the same path to multiple groups.
- The configured paths must already exist in the target repository for Docker to mount them with
  the intended type.
- Keep top-level build metadata needed by roles in `repository`. It is read-only for every role.

To inspect an existing local checkout before filling the mapping:

```bash
find /path/to/checkout -maxdepth 2 -mindepth 1 -type d | sort
find /path/to/checkout -maxdepth 1 -type f | sort
```

The product key (`my-product` above) is the value passed to `--product` later.

The target repository must also contain executable `factory/setup` and `factory/verify` files.
Before registering another project, follow the complete [project lifecycle contract](docs/project-contract.md).

### 7. Write the PDR in Linear

The PDR is the description of a normal Linear issue. There is no PDR file to place in this
repository. Create or edit one Linear issue with:

- a concise title;
- the objective and user-visible behavior;
- explicit acceptance criteria;
- constraints and non-functional requirements;
- out-of-scope items;
- required verification;
- any known open questions.

Resolve material ambiguity before starting the run. Record the stable issue identifier, for example
`BIK-123`; it is safer than using a title because titles can be duplicated or changed.

### 8. Prepare the workspace directory

```bash
mkdir -p workspaces
```

The container runs as UID `10001`. If the worker later reports a permission error for this directory,
fix ownership once:

```bash
sudo chown 10001:10001 workspaces
```

### 9. Run the preflight checks

The wrapper scripts derive `DOCKER_GID` from the live Docker socket. This is important because a
`DOCKER_GID` exported in the shell takes precedence over `.env` and may be stale, especially under
WSL or Docker Desktop. Check access independently with:

```bash
./bin/factory-preflight
```

If it reports that Docker is inaccessible, start Docker Desktop (or Docker Engine) and ensure the
current user can access the socket. On Linux/WSL, after `sudo usermod -aG docker "$USER"`, open a
new shell. The preflight must pass before `factory-up` or `factory-start` can work.

```bash
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
docker compose config --quiet
docker compose build
npm run test:isolation
```

The last command starts a disposable Docker container and proves that read-only, read-write, and
absent paths are enforced. It requires the image built by the preceding command.

### 10. Start the factory

For API key mode:

```bash
./bin/factory-up
docker compose ps
curl --fail http://localhost:8080/health
```

For ChatGPT mode, use `./bin/factory-up-chatgpt` instead of `./bin/factory-up`.

If `FACTORY_PORT` is not `8080`, use the configured port in the health URL. Follow worker activity
with:

```bash
docker compose logs -f worker
```

### 11. Start and manage PDR runs

The repository includes direct wrapper scripts. Run them as `./bin/factory-*`, or make them
available by name for the current shell:

```bash
export PATH="$PWD/bin:$PATH"
factory-help
```

They resolve the factory directory automatically, so after adding the absolute `bin` directory to
`PATH` they can be called from any working directory.
The operational wrappers use `docker compose exec` against the running API container; they do not
create a disposable container for every command. Run `factory-up` before using them.

Use the product key from `factory.yaml` and the stable Linear issue identifier. For the configured
Bikelyo product, run:

```bash
factory-start BIK-123
```

Replace `BIK-123` with the identifier shown at the beginning of the Linear issue title or URL. The
response contains a run UUID. List active work without querying PostgreSQL directly:

If startup returns `LINEAR_UNAVAILABLE`, inspect the message: `401` means the key is invalid or
expired, `403` means it cannot access the workspace, `429` means rate limiting, and a reachability
message means Docker networking or DNS is blocking `https://api.linear.app/graphql`. After changing
`.env`, recreate the API container:

```bash
./bin/factory-down
./bin/factory-up
curl --fail http://localhost:8080/health
```

```bash
factory-list
```

List recent runs or filter by an exact state:

```bash
factory-list --all --limit 20
factory-list --status RUNNING
factory-list --status PAUSED_QUOTA
```

Inspect one run once:

```bash
factory-status RUN_UUID
```

Follow it until it succeeds or fails, printing only state changes:

```bash
factory-watch RUN_UUID
factory-watch RUN_UUID 5
```

For automated diagnostics, follow the API status as JSON until the run reaches a terminal state:

```bash
factory-run-watch RUN_UUID 5
```

Collect a bounded report with the run status, worker and agent logs, active containers, and workspace
Git state:

```bash
factory-diagnostics RUN_UUID
```

The report is written to `diagnostics-RUN_UUID.log`. It contains no factory environment file or API
credentials.

Follow worker diagnostics separately with `factory-logs`. `list` proves whether a
run is assigned and identifies its Linear issue; container logs explain execution failures.

Terminal states are `SUCCEEDED` and `FAILED`. `PAUSED_QUOTA` is non-terminal: its response includes
`resumeAt` and `quotaAttempts`, and the worker resumes it automatically. No container remains active
during the pause. Completed setup and roles are restored from the durable checkpoint; an interrupted
role resumes from the same Git workspace and uses provider session continuation when its adapter
supports it. Configure the retry ceiling in `.env`:

```dotenv
QUOTA_MAX_ATTEMPTS=8
```

A successful run leaves its checkout in
`workspaces/RUN_UUID`, creates one commit, and pushes the Linear-derived branch. The run evidence
contains the branch, commit SHA, verified status, and staged diff. Inspect the local checkout with:

```bash
git -C workspaces/RUN_UUID status --short
git -C workspaces/RUN_UUID show --stat --oneline HEAD
```

The factory publishes only after the agent verifier and `factory/verify` pass.

Run states mean:

- `QUEUED`: waiting for a worker;
- `PREPARING`: cloning, branching, or running setup;
- `RUNNING`: roles or verification are executing;
- `PAUSED_QUOTA`: no agent container is running; automatic resume is scheduled at `resumeAt`;
- `SUCCEEDED`: verified changes were committed and pushed;
- `FAILED`: execution stopped and requires inspection or a new run.

### 12. Stop the factory

```bash
factory-down
```

This preserves PostgreSQL data. `docker compose down -v` deletes database state and should only be
used when that data is intentionally disposable.

## Development commands

| Command | Purpose |
|---|---|
| `npm ci --ignore-scripts` | Install locked development dependencies |
| `npm test` | Run unit tests |
| `npm run test:isolation` | Prove filesystem enforcement with Docker |
| `npm run typecheck` | Check strict TypeScript types |
| `npm run build` | Build all entry points |
| `docker compose config --quiet` | Validate Compose and environment interpolation |

## Documentation

| Document | Contents |
|---|---|
| [Architecture](docs/architecture.md) | Implemented components and trust boundaries |
| [Workflow](docs/workflow.md) | Current run sequence and states |
| [Roles and isolation](docs/roles-and-isolation.md) | Role responsibilities and filesystem policy |
| [PDRs and evidence](docs/pdr-and-evidence.md) | PDR input and retained review evidence |
| [Project lifecycle contract](docs/project-contract.md) | How to make any repository factory-compatible |
| [Operations](docs/operations.md) | Secrets, persistence, recovery, and limitations |
| [Role skills and models](docs/role-skills-and-models.md) | Per-role trusted skill and model mapping |
| [Interim Claude Code workflow](docs/claude-code-interim.md) | Local subagents and skill handoff before factory integration |
| [Interim Codex workflow](docs/codex-interim.md) | Project-scoped Codex agents using the shared factory sequence |
| [Interim OpenCode workflow](docs/opencode-interim.md) | Project-scoped OpenCode agents and `/factory-run` command |
| [Browser sidecars](docs/browser-sidecars.md) | Isolated Playwright MCP access for UI roles |
| [Pilot](docs/pilot.md) | Codex and Claude Code pilot gates |
| [Architecture decisions](docs/decisions/README.md) | Historical and current architectural rationale |
