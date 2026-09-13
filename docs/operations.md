# Operations and Integrations

## External integrations

- **Linear:** PDR input, queue, priority, dependencies, and visible status.
- **GitHub:** repositories, branches, contracts, tests, pull requests, and evidence.
- **Slack:** task threads, questions, notifications, summaries, and explicit approvals.

Agents read only the data their role needs. For writes, they produce a structured request. The
orchestrator checks the role, task, version, and permission before calling the external service.
Tokens do not enter agent context.

Slack conversation may remain free-form, but only an explicit action tied to an object, version,
and consequence triggers a transition. PDR, workflow, merge, release, and flag approvals are
separate actions. A late or duplicate response cannot apply to a new decision.

## Agentic tools

A role may use **Codex**, **Claude Code**, or **OpenCode**. The orchestrator protocol exposes no
vendor-specific concepts. It normalizes at least the request, events, structured result, usage,
checkpoint, and permission decision. Each adapter translates profiles, models, skills, sandbox
settings, and events to and from its tool's format.

Codex and Claude Code document non-interactive execution, machine-readable output, model
selection, session resumption, and permission-aware profiles or agents. OpenCode documents
programmatic CLI execution, agent profiles with per-role models and permissions, and controlled
skill access. These features support adapters but never replace external factory isolation.

Official references reviewed during design:

- [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Codex CLI commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec)
- [Claude Code headless mode](https://code.claude.com/docs/en/headless)
- [Claude Code CLI commands](https://code.claude.com/docs/en/cli-usage)
- [OpenCode CLI](https://opencode.ai/docs/cli/)
- [OpenCode agents](https://opencode.ai/docs/agents/)
- [OpenCode permissions](https://opencode.ai/docs/permissions/)

Model availability depends on the account and provider. If a configured model is unavailable,
the work enters `needs_attention` and asks the PO to correct `factory.yaml`. There is no automatic
fallback to another model or provider.

The pilot validates at least two adapters with the same conformance test. OpenCode belongs to
the supported candidate list; initial adapters and models are selected during pilot preparation.

## Quotas, costs, and timeouts

A temporary quota limit moves the task to `awaiting_capacity`: the factory saves its state and
checkpoint and resumes automatically when capacity returns. This is not treated as a code defect
and does not consume a correction cycle.

During the pilot, the PO closely monitors executions without automatic caps. The factory measures
duration, provider-reported tokens or usage, estimated cost, and human interventions. Before
unattended operation, timeout and spending limits based on this evidence become mandatory. A
spending cap does not authorize expenditure; it only defines when execution must stop.

## Persistence and recovery

PostgreSQL stores the task, role, state, attempt, PDR/workflow/configuration revisions, approvals,
open decisions, artifact references, duration, usage, and summarized errors.

The factory does not retain every prompt, response, video, or full trace. Heavy artifacts exist
only as required evidence or targeted failure diagnostics. Profiles and skills are identified by
version or hash.

After restart, the orchestrator compares PostgreSQL, Linear, and GitHub before resuming. It never
repeats an external effect without an idempotency key or an outcome check. If the actual outcome
cannot be established safely, the work remains suspended.

V1 does not build dedicated backup or disaster recovery. Complete VPS loss may require manual
reconstruction; this is an accepted pilot limitation.

## Communication

Each task has a Slack thread and one initial contact. A blocking message contains context, a
proposal, and consequences. Blocking questions and issues requiring intervention are sent
immediately, without overnight reminders.

At 09:00 `Europe/Berlin`, the factory posts a daily summary of results, waits, and decisions;
details remain available in Linear. Future deployments may route conversations to separate PM,
Engineering Lead, or other responsible contacts.

## Release and checks

The separate operations service receives an immutable proposal and approval and may perform a
deployment, rollback, or feature flag change. Agents never receive its credentials. After a
deployment, flag change, or PO request, the factory runs black-box checks and reads observability.

V1 does not act autonomously on anomalies. It gathers evidence and proposes an action. Rollback
and corrective flag shutdown also require approval.
