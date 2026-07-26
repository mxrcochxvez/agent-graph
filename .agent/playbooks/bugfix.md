# Bugfix Playbook

Use this playbook when existing behavior is incorrect, unstable, or regressed.

## Context

- Reproduce the failure or identify the strongest available evidence.
- Find the responsible code path and determine whether the issue is local or systemic.
- Review related history, tests, logs, and recent changes.

## Outcome

Acceptance criteria should include the corrected behavior and a regression condition proving the original failure no longer occurs.

## Plan

Prefer fixing the underlying cause rather than suppressing the symptom. Record compatibility risks and nearby behaviors that could share the same defect.

## Verification

Add or update a regression test whenever practical. Run the focused reproduction first, then broader checks that cover affected boundaries.

## Review

Confirm the patch does not hide errors, weaken validation, broaden scope, or change unrelated behavior. Verify the regression test fails without the fix when feasible.
