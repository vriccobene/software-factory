# Roles and Isolation

## Roster

| Role | Responsibility | Allowed writes |
|---|---|---|
| `feature-intake` | Reviews the PDR and proposes the workflow | Plan and workflow proposal |
| `contract-designer` | Defines a verifiable boundary between components | Contract and simulation |
| `test-writer` | Writes backend tests, including black-box tests | Backend tests |
| `backend-builder` | Implements logic, persistence, jobs, and APIs | Backend production code |
| `ui-test-writer` | Writes UI component and end-to-end tests | UI and E2E tests |
| `ui-builder` | Implements the frontend and contract integration | Frontend production code |
| `infra-builder` | Implements repositories, environments, CI, and procedures | Declared infrastructure |
| `security-auditor` | Finds vulnerabilities and policy violations without fixing them | None; produces findings |
| `doc-keeper` | Aligns documentation with approved contracts | Documentation |
| `verifier` | Assesses the diff and evidence against the criteria | None; produces a verdict |

Roles are available capabilities, not a mandatory checklist. `feature-intake` proposes the
relevant subset, and the PO approves the concrete DAG.

## Test and implementation separation

Test authors do not receive implementation source code, implementer diffs and commits, or
implementer conversations. They receive the approved PDR, public contract, relevant existing
tests, synthetic data, visual references when required, and an application available through
public interfaces. `ui-test-writer` also receives browser and Playwright access.

Builders may read and run tests, but test directories are mounted read-only. When a test is
wrong, the builder provides evidence and the appropriate test author owns the correction. A
behavior change or weaker guarantee requires PO approval.

This separation makes tests derive from required behavior instead of implementation structure.
Tests may use public APIs and interfaces; not every test must be end-to-end.

## Layered enforcement

Each execution uses complementary controls:

1. The worker materializes only the inputs visible to the role.
2. An ephemeral container isolates processes and filesystems.
3. Explicit mounts distinguish writable, read-only, and absent areas.
4. Network access is denied by default and allowed per destination.
5. The tool's sandbox applies another permission layer.
6. The orchestrator rejects diffs outside allowed paths.
7. Dedicated branches and worktrees isolate and attribute role changes.

A violation is not fixed by widening the running agent's permissions. Work is assigned to the
owning role, or the workflow returns to the PO for approval.

## Skills and tools

Each role profile explicitly lists available skills and tools. Test authors do not receive
skills that modify production code; builders cannot write tests. UI agents and `verifier` may
use Playwright and a browser. `verifier` may read the complete diff and all tests but cannot
modify them.

Native Codex, Claude Code, and OpenCode configuration is an adapter detail. Containers, mounts,
network policy, and external diff validation enforce the real boundaries. Prompt instructions
are never treated as a security control.

## Production

Agents receive no production database, shell, cloud console, object storage, or application
secrets. They may perform black-box checks through public browser and API surfaces, optionally
with a least-privileged synthetic account. The PDR declares the allowed checks and effects.

Product observability is read-only during post-deployment checks, post-flag-change checks, or
checks requested by the PO. The product must never place sensitive data in metrics, logs, or
traces. Agents report anomalies with evidence and proposals; they cannot change alerts,
configuration, or data.
