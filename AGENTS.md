# Agent Graph Operating Instructions

Use this repository's assignment graph for every substantial software task.

## Core workflow

Move assignments through these stages in order unless the graph explicitly permits a repair loop:

1. `intake`
2. `classify`
3. `context`
4. `outcome`
5. `plan`
6. `implement`
7. `verify`
8. `review`
9. `deliver`
10. `complete`

Use the `agent-graph` MCP tools when available. Otherwise use `npm run agentctl -- ...`.

## Batches

When working multiple tickets in one session, start a batch. Use the batch planning loop (`plan` → `plan` with a revision note) until the plan summary is solid, then advance to `execute`. Work only the current ticket from `batch next` / `get_batch_next` through the full assignment graph before starting another. Skip a ticket only with an explicit reason when it should not block the batch.

## Required behavior

- Inspect the repository, current branch, working tree, relevant issue, and nearby code before editing.
- Convert vague requests into explicit acceptance criteria and record them.
- State assumptions in assignment notes rather than silently expanding scope.
- Prefer the smallest coherent change that satisfies the acceptance criteria.
- Do not push directly to `main` or merge a pull request unless the user explicitly requests it.
- Never discard unrelated user changes.
- Run the repository's real checks: tests, linting, type checking, build, and focused manual verification when applicable.
- Record verification evidence. Do not describe work as complete while required checks are failing or unrun.
- Review the final diff independently from the implementation pass. Look for regressions, scope creep, missing tests, security concerns, and inaccurate claims.
- Deliver a concise summary containing changed files, checks run, results, known risks, and any remaining manual steps.

## Approval boundaries

Proceed without asking for routine local reads, edits, tests, builds, and non-destructive Git operations that are necessary for the requested task.

Require explicit approval before:

- Pushing commits or opening/merging a pull request when that was not requested
- Changing production infrastructure or data
- Destructive Git operations
- Deleting user data
- Purchasing services or materially expanding scope

## Repair loops

A failed verification returns the assignment to `implement`. A review that finds a blocking issue also returns it to `implement`. Record why the repair loop was entered and rerun the affected checks afterward.

## Evidence standard

A passing claim must name the command or manual check that produced it. A skipped check must include a reason. Do not infer success from code inspection alone when an executable check exists.
