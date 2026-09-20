# Workflow

## Run sequence

1. The Product Owner writes and approves a PDR in a Linear issue.
2. The CLI sends the product key and Linear issue identifier to the local API.
3. The API resolves the issue, stores its snapshot and hash, and creates a `QUEUED` run.
4. The worker claims the run, marks it `PREPARING`, clones the repository and base branch from
   trusted `factory.yaml` configuration, then creates the working branch using Linear's format
   `<creator-username>/<identifier>-<title>` (lowercase kebab case), for example
   `alex/eng-123-fix-login-error`.
5. The worker validates both fixed lifecycle hooks and runs `factory/setup` with its configured
   capabilities. Setup must not change Git-visible files.
6. `feature-intake` runs read-only and returns the smallest relevant subset of the role roster.
7. Each selected role runs sequentially in its own container with its filesystem policy.
   After each completed role, the worker persists a provider-neutral checkpoint. If an adapter
   reports quota exhaustion, the current role container exits and the run enters `PAUSED_QUOTA`.
   When selected, `observability-builder` runs after production and infrastructure builders, designs
   the required signals, and instruments their changes only through an observability system already
   present in the product.
8. The agent `verifier` runs last with read-only access to the configured repository paths. Its final
   structured verdict must be `PASS`; `FAIL` or malformed output fails the run.
9. The worker runs deterministic `factory/verify`. It fails if a check fails or the hook changes
   Git-visible files.
10. The worker stages the verified diff, creates one traceable commit, and pushes it with an explicit
    `HEAD:refs/heads/<linear-branch>` refspec. A protected destination, empty diff, push conflict, or
    any other publication error fails the run; force-push is never used.
11. The worker stores bounded lifecycle and role output, verified Git status and diff, branch name,
    and commit SHA, then marks the run `SUCCEEDED`.
12. The Product Owner reviews the published branch and decides whether to open or merge a pull request.

Operators use `cli list` to identify the Linear issue currently assigned to the worker, `cli status`
for a single snapshot, `cli watch` for state changes, and container logs for diagnostics.

Selected roles share changes through the same host workspace. This is a direct filesystem handoff,
not a patch-transfer or intermediate commit-merging subsystem.

## States

```text
QUEUED → PREPARING → RUNNING ─────────────────────────→ SUCCEEDED
                         │  ↑                              ↘ FAILED
                         ↓  │
                    PAUSED_QUOTA
                    (resume_at due)
```

Quota-paused runs keep their workspace and durable checkpoint, not their agent container. When
`resume_at` is due, the worker reclaims the run, skips completed phases, and retries the interrupted
role. A provider adapter may supply an opaque continuation ID; without one, the role starts a new
session against the preserved Git state. Unexpectedly interrupted `PREPARING` or `RUNNING` runs are
still marked `FAILED` on worker startup.

## Supervision boundary

The current workflow has no interactive clarification channel. If a PDR is materially ambiguous,
the role output may report it, but the run is not paused for an answer. PDR ambiguity should
therefore be resolved before starting the pilot.
