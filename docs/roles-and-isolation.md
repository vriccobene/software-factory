# Roles and Filesystem Isolation

## Role roster

| Role | Responsibility | Writable group |
|---|---|---|
| `feature-intake` | Select the smallest relevant role set | none |
| `contract-designer` | Define verifiable component boundaries | `contracts` |
| `test-writer` | Derive backend tests from observable behavior | `tests` |
| `backend-builder` | Implement backend behavior | `backend` |
| `ui-test-writer` | Derive UI and end-to-end tests | `ui-tests` |
| `ui-builder` | Implement frontend behavior | `frontend` |
| `infra-builder` | Implement declared infrastructure and CI | `infrastructure` |
| `observability-builder` | Design and implement telemetry through the existing observability system | `backend`, `frontend`, `infrastructure` |
| `security-auditor` | Report security violations | none |
| `doc-keeper` | Align documentation with approved behavior | `documentation` |
| `verifier` | Return an evidence-based verdict | none |

`feature-intake` runs first. Its returned identifiers are schema-checked, de-duplicated, and ordered by
the canonical roster. Intake and verifier cannot be selected as ordinary work roles; the launcher
adds `verifier` last unconditionally.

The verifier's final message is machine-enforced JSON:

```json
{"verdict":"PASS","summary":"Concise evidence-based reason"}
```

Only `PASS` permits deterministic project verification to begin. `FAIL`, missing output, malformed
JSON, or an unsupported verdict fails the run.

## Enforcement

Each role receives a new Docker container with:

- an unprivileged UID;
- a read-only root filesystem;
- all Linux capabilities dropped;
- `no-new-privileges`;
- bounded temporary filesystems;
- no Docker socket;
- only explicitly configured bind mounts.

Visible groups are mounted below `/role/workspace`. Writable groups use read-write mounts; every
other visible group is read-only; unlisted groups are absent. Duplicate mount targets, escaping
paths, unsafe image names, unsafe environment names, and targets outside `/role` are rejected before
Docker starts.

Provider network access is an explicit exception: Codex role containers use Docker bridge networking
so they can reach the OpenAI API. The default isolation helper otherwise disables networking.

## Skills, models, and browser access

Trusted `factory.yaml` assigns skills and model IDs independently per role. Only assigned skill
directories are mounted, read-only, under `/role/skills`; see
[Role skills and models](role-skills-and-models.md).

Only `ui-builder` and `ui-test-writer` can receive browser automation. Each gets a temporary,
private-network [Playwright MCP sidecar](browser-sidecars.md) without a Docker socket, repository
mount, credentials, host port, or persistent browser profile.

## Test/code separation

Backend and UI test writers do not receive the corresponding production source group. Builders can
read their tests but cannot modify them. The verifier and security auditor can read all configured
groups and cannot write any of them. The observability builder runs after selected production and
infrastructure builders. It can read all configured groups but can write only backend, frontend, and
infrastructure paths; it cannot modify tests, UI tests, contracts, or documentation.

All roles work on the Linear-derived branch `<creator-username>/<identifier>-<title>`. Changes are shared through the host workspace between sequential role invocations. Docker mount
permissions are the write-enforcement mechanism; there is no role branch, worktree, patch-transfer,
or commit-merging layer.
