# Agent Graph setup for AI agents

[← Back to README](../README.md)

Use this document when the user asks you to install or wire up Agent Graph for them. Prefer MCP tools from the `agent-graph` server when available; otherwise use `npm run agentctl -- ...`.

## Goal

Get Agent Graph runnable in this clone, verify it, and leave the user able to track assignments (CLI and/or MCP).

## Preconditions

Confirm before changing anything material:

- Working directory is this repository root (contains `package.json`, `AGENTS.md`, `.agent/`)
- Node.js `>= 20` (`node -v`)
- npm available (`npm -v`)
- Do **not** push, merge, force-reset, or discard unrelated user changes unless the user explicitly asks

## Setup procedure (do in order)

1. **Install dependencies**

```bash
npm install
```

2. **Typecheck and test**

```bash
npm run check
npm test
```

Both must pass before you claim setup is done.

3. **Discover workers** (optional but useful to report)

```bash
npm run agentctl -- providers
```

Record which of `claude`, `codex`, `opencode`, `agy` are present. Missing workers are OK for local tracking; they only matter for `run_assignment_agent` / `agentctl run`.

4. **Smoke-test the CLI**

```bash
npm run agentctl -- start SETUP-SMOKE --type documentation --summary "Agent Graph setup smoke test"
npm run agentctl -- criteria SETUP-SMOKE "CLI can start and read an assignment"
npm run agentctl -- status SETUP-SMOKE
```

5. **MCP for the user’s coding host**

Checked-in config already exists:

- Claude Code / Cursor-style: `.mcp.json` → server `agent-graph` via `npm run mcp`
- Codex: `.codex/config.toml` → same server

After install:

- Ask the user to approve/reload the project MCP server if prompted
- Verify tools are visible (e.g. Codex: `/mcp` or `codex mcp list`)
- Prefer MCP: `start_assignment`, `advance_assignment`, `add_acceptance_criterion`, `record_verification`, `record_review`, `record_delivery`, batch tools as needed

6. **Point state at this repo**

Default state dir is `.agent/state/`. The MCP env `AGENT_GRAPH_STATE_DIR` should stay under this project unless the user wants a shared location.

## Operating rules while helping the user

- Follow `AGENTS.md` for any substantial software task after setup.
- Advance assignments one valid node at a time; do not skip required evidence.
- Failed verification or a blocking review → return to `implement` and record why.
- For multiple tickets: start a batch, plan until solid, `advance` to `execute`, then work only `get_batch_next` / `batch next` current ticket through complete before the next.
- Do not claim completion without naming the commands you ran and their results.

## Done checklist (report to the user)

- [ ] `npm install` succeeded
- [ ] `npm run check` passed
- [ ] `npm test` passed
- [ ] `agentctl providers` output summarized
- [ ] Smoke assignment created (or MCP equivalent verified)
- [ ] MCP server path explained for their host (Claude Code / Codex / other)
- [ ] Any missing worker CLIs listed with install impact (tracking still works without them)

## Custom CLI paths (only if needed)

```bash
export AGENT_GRAPH_CLAUDE_COMMAND=/custom/path/claude
export AGENT_GRAPH_CODEX_COMMAND=/custom/path/codex
export AGENT_GRAPH_OPENCODE_COMMAND=/custom/path/opencode
export AGENT_GRAPH_ANTIGRAVITY_COMMAND=/custom/path/agy
```

After setup, use the [README](../README.md) for workflow details, CLI examples, and architecture.
