# ADR-003: Divide Systems of Record

## Status

Accepted — 2026-09-13

## Context

Linear, PostgreSQL, GitHub, and Slack solve different problems. Treating one as the universal
database would create mutable copies or lose state required for recovery.

## Decision

Linear stores PDRs and planning; PostgreSQL stores approved snapshots and technical state;
GitHub stores code and evidence; Slack stores conversations and human actions. A discrepancy
suspends the affected work.

## Consequences

The orchestrator must reconcile several systems, but each piece of information has one source of
authority and each approval remains tied to the correct version.
