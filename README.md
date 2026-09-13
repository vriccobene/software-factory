# Software Factory

This repository describes and, in the next phase, will contain a personal software agent
factory. The factory turns an approved PDR into code,
reviewable evidence, a pull request, and—after separate authorization—a release.

Vincenzo is the initial Product Owner (PO) and remains responsible for goals, priorities,
requirements, and trade-offs. The factory reviews PDRs, proposes an execution plan, performs
authorized work, and presents understandable results. It does not make product decisions on
behalf of the PO.

This repository currently contains the **approved design**, not the factory implementation.

## Documentation

| Document | Contents |
|---|---|
| [Architecture](docs/architecture.md) | System boundaries, components, systems of record, and configuration |
| [Workflow](docs/workflow.md) | From PDR to merge and release, including states and recovery |
| [Roles and isolation](docs/roles-and-isolation.md) | Roster, responsibilities, permissions, and test/code separation |
| [PDRs and evidence](docs/pdr-and-evidence.md) | PDR contract, versioning, tests, and review evidence |
| [Operations](docs/operations.md) | VPS, integrations, agentic tools, quotas, and notifications |
| [Pilot](docs/pilot.md) | Initial validation, gates, and deferred decisions |
| [Architecture decisions](docs/decisions/README.md) | Rationale for structural choices |

## Status

The design is approved. The pilot preparation will determine the real PDRs, models per role,
operational limits, VPS sizing, observability platform, and some feature flag details. These are
explicit gates in [Pilot](docs/pilot.md), not implicit assumptions.

Product repositories are cloned below `.code/<repository>`. A product configuration may declare
multiple repositories; v1 runs work for one product at a time.
