# PDRs and Evidence

## PDR requirements

The PDR is written and maintained in Linear in language the PO can understand. Before approval,
`feature-intake` checks the goal, observable behavior, verifiable criteria, prerequisites,
dependencies, required design input, security, privacy, regressions, observability, test
strategy, expected evidence, and open questions.

The final template will evolve through problems observed in the pilot. The feature flag section
and its fields remain optional. Before executing a PDR that uses a flag, the project must decide
which details become mandatory. Relevant details include initial state, target users, enabled
and disabled behavior, unavoidable side effects, and the removal condition for temporary flags.

For a temporary flag, the factory proposes a cleanup task when its removal condition is met. The
task enters the queue only after approval.

## Versions and changes

Linear is the editable source. When a task enters `pm_accepted`, the orchestrator retrieves the
complete PDR, computes a hash, and stores an immutable PostgreSQL snapshot with the workflow and
approval.

Linear issue webhooks notify the factory of changes. The receiver verifies the signature and
timestamp, deduplicates the delivery identifier, and suspends affected work when the PDR changes.
Because delivery may be lost or delayed, the orchestrator also fetches the PDR and compares its
hash before every transition.

Reference: [Linear webhooks](https://linear.app/developers/webhooks).

A new version never changes existing work or evidence retroactively. The factory shows the diff,
consequences, and work that must be repeated, then waits for PO approval.

## UI/backend contract

When a boundary exists between frontend and backend, `contract-designer` translates the approved
PDR into a technically feasible contract. It does not introduce product decisions. If the PDR
does not determine a required choice, the role suspends the affected work and asks a question
with context, a proposal, and consequences.

The frontend simulation and the real backend derive from the same contract. Tests and builders
do not maintain divergent copies. `doc-keeper` verifies final alignment without changing the
contract autonomously.

## Tests

Every test contains an English comment explaining what it verifies. Suites include black-box
tests of observable behavior and public interfaces, while allowing lower-level tests when they
provide useful evidence.

Tests and final verification come from executions separate from implementers. Implementers may
read and run tests but cannot modify them. Human test review is optional. During pull request
review, the PO may request new evidence, reactivating the relevant roles and invalidating any
evidence affected by the change.

## Review package

The pull request provides:

- an English plain-language summary;
- the approved PDR copy and hash;
- a criterion-to-result-to-evidence map;
- the exact verified revision;
- a preview and instructions for trying it;
- relevant commands, results, and artifacts;
- security and regression checks;
- declared limitations, skipped checks, and uncertainty.

Missing evidence is not success. Evidence belongs to an exact revision; a change invalidates
any evidence it may affect.

Production checks begin with public, non-destructive paths. Authenticated paths are added only
when a suitable synthetic account exists. Periodic checks and preventive penetration tests are
future capabilities.
