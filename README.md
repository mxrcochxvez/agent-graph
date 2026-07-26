# Agent Graph

A portable software-engineering workflow for Codex, Claude Code, and any MCP-compatible coding agent.

The repository gives coding agents one repeatable process for handling assignments:

`intake → classify → context → outcome → plan → implement → verify → review → deliver`

It includes:

- Shared operating instructions in `AGENTS.md`
- Claude Code instructions that import the shared rules
- Project-scoped MCP configuration for Claude Code and Codex
- A TypeScript MCP server exposing assignment workflow tools
- An `agentctl` CLI for humans and agents
- File-backed assignment state under `.agent/state/`
- A declarative graph and task playbooks
- CI checks for TypeScript and workflow tests

## Requirements

- Node.js 20 or newer
- npm
- Codex CLI, Claude Code, or another MCP client

## Setup

```bash
npm install
npm run check
npm test
```

## Use the CLI

```bash
npm run agentctl -- start ENG-4521 --type feature --summary "Make the device picker resizable"
npm run agentctl -- criteria ENG-4521 "The picker can be resized"
npm run agentctl -- advance ENG-4521 context
npm run agentctl -- status ENG-4521
```

Record verification and delivery evidence:

```bash
npm run agentctl -- verify ENG-4521 tests passed --details "npm test"
npm run agentctl -- review ENG-4521 "Reviewed the final diff; no blocking issues found"
npm run agentctl -- deliver ENG-4521 "PR ready with tests and implementation summary"
```

## Claude Code

The checked-in `.mcp.json` registers the local MCP server. After cloning:

1. Run `npm install`.
2. Open the repository in Claude Code.
3. Approve the project-scoped MCP server when prompted.
4. Ask Claude to run the assignment graph for a task.

Example:

```text
Start assignment ENG-4521 as a bug fix. Inspect the repository, define acceptance criteria,
implement the fix, verify it, independently review the diff, and prepare a PR-ready delivery.
```

## Codex

The checked-in `.codex/config.toml` registers the same local MCP server for trusted projects. After cloning and installing dependencies, open the repository with Codex and confirm the server with `/mcp` or `codex mcp list`.

## MCP tools

The server currently exposes:

- `start_assignment`
- `get_assignment`
- `list_assignments`
- `advance_assignment`
- `add_acceptance_criterion`
- `record_verification`
- `record_review`
- `record_delivery`

## Current scope

This first version is deliberately local and auditable. It stores workflow state as JSON and does not call an LLM itself. Codex or Claude Code remains the reasoning and code-execution layer, while this project enforces shared workflow state and evidence.

Natural next integrations are GitHub, Linear/Jira/ClickUp, CI status, worktrees, approval gates, and an optional LangGraph runtime for durable remote execution.

## License

MIT
