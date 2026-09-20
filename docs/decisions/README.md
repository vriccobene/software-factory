# Architecture Decision Records

ADRs explain structural decisions and their rationale. The linked operational documents remain
the normative source for details; ADRs do not duplicate them.

| ADR | Decision |
|---|---|
| [ADR-001](001-deterministic-orchestration.md) | Superseded custom orchestration design |
| [ADR-002](002-role-isolation.md) | Partly superseded isolation design; external mounts retained |
| [ADR-003](003-systems-of-record.md) | Deferred multi-system design |
| [ADR-004](004-agentic-tool-adapters.md) | Superseded full provider-neutral adapter design |
| [ADR-005](005-local-mvp-runtime.md) | Run the local MVP with trusted repository selection |
| [ADR-006](006-tool-native-coordination.md) | Use tool-native coordination with external filesystem isolation |
| [ADR-007](007-project-lifecycle-contract.md) | Use two fixed project lifecycle hooks |
| [ADR-008](008-verified-branch-publication.md) | Publish only verified Linear-derived branches |
| [ADR-009](009-github-app-credentials.md) | Use short-lived, worker-only GitHub App credentials |
| [ADR-010](010-provider-neutral-quota-resume.md) | Pause and resume provider quota failures from durable checkpoints |
| [ADR-011](011-role-skills-and-models.md) | Configure trusted skills and opaque model IDs per role |
| [ADR-012](012-isolated-playwright-sidecars.md) | Give only UI roles isolated Playwright MCP sidecars |
| [ADR-013](013-codex-chatgpt-authentication.md) | Support ChatGPT authentication for Codex roles |
| [ADR-014](014-hardened-ui-design-skills.md) | Vendor hardened, no-paid design skills only for the UI builder |
| [ADR-015](015-interactive-app-contribution.md) | Separate interactive App contribution from human PDR acceptance |
