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

## Interim OpenCode factory runs

When explicitly asked to execute an approved PDR through local OpenCode roles,
use the `factory-run` skill and `docs/opencode-interim.md`. Keep the Product
Owner responsible for product decisions and preserve existing uncommitted work.
