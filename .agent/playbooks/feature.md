# Feature Playbook

Use this playbook when an assignment adds user-visible or system behavior.

## Context

- Locate the owning module and adjacent patterns.
- Identify public interfaces, data contracts, migrations, configuration, and feature flags.
- Check existing tests and documentation for the affected behavior.

## Outcome

Acceptance criteria should describe observable behavior, compatibility expectations, failure behavior, and any explicit non-goals.

## Plan

Record the intended files, data-flow changes, test levels, rollout concerns, and rollback strategy when applicable.

## Verification

Prefer focused unit or integration tests plus the repository-wide checks required by `AGENTS.md`. Exercise the changed user path manually when automation does not fully cover it.

## Review

Check backwards compatibility, error states, accessibility, performance, security, telemetry, and whether the implementation introduced unnecessary abstractions.
