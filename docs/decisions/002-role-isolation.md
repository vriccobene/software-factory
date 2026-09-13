# ADR-002: Enforce Role Boundaries Outside Prompts

## Status

Accepted — 2026-09-13

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
