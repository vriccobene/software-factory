# ADR-001: Separate Agents and the Orchestrator

## Status

Accepted — 2026-09-13

## Context

Agents must interpret PDRs and produce work, while the factory must recover from errors, quota
limits, and restarts without duplicating effects or losing approvals. Giving both responsibilities
to an agent conversation would make transitions difficult to reconstruct.

## Decision

`feature-intake` proposes the task DAG. A software orchestrator applies explicit rules, persists
state in PostgreSQL, and invokes roles. The Slack contact communicates but makes no product
decisions.

## Consequences

Agents remain replaceable and executions remain reconstructable. The orchestrator must reconcile
external systems and persist every meaningful transition.
