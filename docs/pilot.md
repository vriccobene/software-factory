# Pilot and Deferred Decisions

## Scope

The pilot uses a small number of real PDRs selected by the PO when the factory is ready. It does
not invent tasks, defects, or questions to pass an evaluation. Synthetic tests are limited to
factory mechanisms, such as proving that a read-only mount blocks a write.

## Behaviors to demonstrate

The pilot must show that:

1. a real PDR passes through review, approval, implementation, verification, pull request, and preview;
2. when relevant, UI and backend proceed in parallel from one contract and integrate correctly;
3. a question suspends only affected work while another authorized task can proceed;
4. a task resumes after an answer or restart without duplicating work;
5. a real request for more evidence reactivates only the required roles;
6. out-of-scope writes and unauthorized network access are blocked;
7. state, approvals, and versions remain consistent across PostgreSQL, Linear, and GitHub;
8. at least two adapters pass the same minimum conformance test;
9. duration, usage, and PO interventions are measured.

Adapter conformance covers non-interactive execution, structured results, model selection,
profile application, permitted changes, blocked forbidden changes, controlled skill use,
checkpointing, suspension, and resumption.

## Gate before unattended operation

Operation while the PO is asleep remains disabled until pilot evidence supports a spending cap,
execution timeout, repeated-timeout policy, VPS capacity, and minimum signals for detecting a
stalled factory.

## Deferred decisions

| Decision | Required by |
|---|---|
| Real pilot PDRs | First product execution |
| Default tool and model for each role | Initialization |
| First two adapters to validate | Conformance testing |
| VPS provider and sizing | Installation |
| Budget and timeout values | Unattended operation |
| Product observability platform | Checks that require it |
| Required fields for a PDR that uses a feature flag | First flagged PDR |
| Stable and production branch names | First Git workflow |
| Authenticated production paths to check | Corresponding release |

These decisions do not block implementation of the factory core. Each gate blocks only the
action that depends on the missing choice.
