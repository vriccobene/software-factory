# ADR-002: Enforce Role Boundaries Outside Prompts

## Status

Superseded in part by ADR-006 — 2026-09-14. External filesystem enforcement remains accepted;
role-specific branches and worktrees are not part of the supervised MVP. The worker uses one
Linear-derived working branch for the run.

## Context

Test authors are not independent when they can read the implementation. A prompt-only rule also
cannot prevent a builder from changing a test it cannot satisfy.

## Decision

Each invocation uses minimal context, an ephemeral container, controlled mounts, restricted
network access, a sandbox, diff validation, and a dedicated branch and worktree. Test authors
cannot see source code; builders see tests as read-only.

## Consequences

Workspace preparation is more complex, but controls outside the agent prevent or detect errors
and violations.
