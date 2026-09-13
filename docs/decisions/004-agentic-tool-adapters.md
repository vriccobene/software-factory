# ADR-004: Use Agentic Tool Adapters

## Status

Accepted — 2026-09-13

## Context

Codex, Claude Code, and OpenCode use different formats for models, agents, events, skills,
sessions, and permissions. The factory must select a tool and model per role.

## Decision

The orchestrator uses a neutral protocol for requests, events, results, usage, checkpoints, and
permission decisions. Adapters translate between this protocol and each tool's format.

## Consequences

The pilot must exercise at least two adapters. A new tool can be added without changing workflow
or state, but every adapter requires a conformance test.
