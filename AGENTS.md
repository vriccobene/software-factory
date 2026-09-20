# Project Instructions

## Language

- Write and maintain all project documentation in English.
- Write ADRs, configuration descriptions, user-facing repository text, and code comments in English.
- Use English for file and directory names created for documentation.
- Preserve external proper names and exact identifiers as written by their owners.
- Conversation with a user may follow the user's language, but repository content remains English.

## Documentation

- Treat `README.md` and `docs/` as the current project documentation.
- Keep one normative source for each rule and link to it instead of maintaining conflicting copies.
- Record significant architectural changes as ADRs under `docs/decisions/`.
- Update documentation whenever implementation changes an approved behavior or boundary.

## Product documentation is mandatory input

- Before planning, implementing, reviewing, or verifying product work, locate and read the
  product's current normative documentation from the active checkout or worktree. Read the
  relevant PDR, architecture, decisions, contracts, and acceptance criteria instead of relying
  on memory, handoff summaries, archived copies, or assumptions.
- Treat conformity with that documentation as a required acceptance condition for every factory
  role. Trace proposed and implemented behavior to the applicable requirements and verify it with
  evidence appropriate to the role; never claim completion from tests alone when the documented
  contract also requires operational or human evidence.
- If product documents conflict, are stale, or leave a decision open, surface the discrepancy to
  the Product Owner. Do not silently choose a source, invent an approval, or weaken a documented
  requirement.
- For mutable facts about external products, providers, standards, or services, verify the current
  information against their authoritative official documentation before using it in a decision or
  implementation, and record the source and verification date where the product documentation
  requires evidence.

## Linear branch naming

When a run originates from a Linear issue, use the branch format
`<creator-username>/<identifier>-<title>`, normalized to lowercase kebab case. For example,
`alex/eng-123-fix-login-error`. Do not substitute a generic `feature/` or `fix/` prefix.

## Interim factory runs

When explicitly asked to execute an approved PDR through local Codex or OpenCode
roles, use the `factory-run` skill and the matching interim guide under `docs/`.
Keep the Product Owner responsible for product decisions and preserve existing
uncommitted work.
## Interim OpenCode factory runs

When explicitly asked to execute an approved PDR through local OpenCode roles,
use the `factory-run` skill and `docs/opencode-interim.md`. Keep the Product
Owner responsible for product decisions and preserve existing uncommitted work.
