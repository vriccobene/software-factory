# Supervised Pilot

## Gate 1: Codex PDR

Choose one small, real PDR whose repository paths can be represented by the current path groups and
whose repository implements the lifecycle contract.

The gate passes when:

1. the PDR snapshot is stored from its Linear identifier;
2. setup completes without changing Git-visible files;
3. intake selects only relevant roles;
4. every selected role can see and write only its declared paths;
5. the agent verifier provides a valid evidence-based `PASS` verdict;
6. deterministic project verification passes without changing Git-visible files;
7. the verified result is committed and pushed only to the Linear-derived, non-protected branch;
8. the run evidence identifies the published branch and exact commit SHA;
9. the Product Owner can understand failures from the run record and worker logs.

Also exercise one rejected filesystem write through the Docker isolation test. Do not use a valuable
PDR as an abuse test.

## Gate 2: Claude Code PDR

After the Codex pilot, add a small provider-specific Claude Code launcher. Reuse the role intent and
external isolation policy without introducing a shared provider framework. Run a second, different
PDR and verify the same safety and evidence outcomes.

## Decisions after both pilots

Use observed duplication and operational pain to decide whether the factory needs interactive
questions, retries, cost limits, richer evidence, pull-request automation, or a shared provider interface.
Do not add them pre-emptively.
