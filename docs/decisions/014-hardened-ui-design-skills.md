# ADR 014: Vendor Hardened UI Design Skills

## Status

Accepted

## Date

2026-09-19

## Context

The UI builder benefits from stronger visual-direction and design-system references. Three upstream
projects were evaluated: Taste Skill, Impeccable, and awesome-design-md. Their upstream forms are
not suitable for direct installation under the factory's trust model.

Taste Skill v2 directs an agent to use image generation when available and includes remote asset
and package-install examples. Impeccable runs a launcher that may download a native executable and
contains hosted API, browser-injection, local-server, and metered image-generation paths.
awesome-design-md is a reference collection rather than a skill and includes package-on-demand and
download-and-execute command text in some documents.

Skills are trusted agent instructions under ADR 011. Read-only mounts prevent a skill from changing
itself but do not make unsafe instructions harmless.

## Decision

Vendor locally hardened, commit-pinned profiles under `.agents/skills`:

- `design-taste-frontend`, derived from Taste Skill commit
  `e79ca9ec7e071eb3a3b623c4fb752e853fc3ed58`;
- `impeccable`, derived from Impeccable commit
  `f2c7051853848826aac2f4646581d62a732155ad`;
- `awesome-design-md`, derived from awesome-design-md commit
  `8147538b4226ae41e2487a9179e3bcc1f68e8554`.

The Taste and Impeccable profiles are instruction-only. They contain no scripts or binaries and
explicitly deny paid services, runtime downloads, remote assets, package installation, and
authority expansion. The awesome-design-md profile exposes only sanitized local references and
treats their command-like content as non-executable design data.

Assign all three profiles exclusively to `ui-builder` in the isolated factory configuration and
the interim Codex, Claude Code, and OpenCode role definitions. The existing frontend engineering
skill, approved PDR, contracts, accessibility requirements, and established product identity take
precedence over aesthetic guidance.

Upstream updates are manual. Each update requires a new security and cost audit and must preserve
the no-executable, no-network, and no-paid-service invariants.

## Alternatives Considered

### Install upstream distributions unchanged

Rejected because they contain automatic or instructed external execution and metered-service
paths that exceed the requested trust and cost boundaries.

### Assign the design skills globally or to both UI roles

Rejected because UI test authors do not need art-direction instructions, and broader assignment
would violate least privilege.

### Omit awesome-design-md

Rejected because the static references remain useful after command content is neutralized and the
wrapper prevents implicit brand selection or copying proprietary assets.

## Consequences

The UI builder receives stronger design guidance consistently across all supported workflows
without gaining additional tools, network access, or cost-bearing behavior. The factory owns the
maintenance and security review of these forks and does not automatically inherit upstream fixes
or features.
