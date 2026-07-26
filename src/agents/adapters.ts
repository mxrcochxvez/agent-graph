import { commandAvailable, runInvocation } from "./process.js";
import type {
  AgentAdapter,
  AgentEventHandler,
  AgentRunRequest,
  AgentRunResult,
  CommandInvocation
} from "./types.js";

function commandFromEnvironment(variable: string, fallback: string): string {
  return process.env[variable]?.trim() || fallback;
}

export function buildClaudeInvocation(
  request: AgentRunRequest,
  command = commandFromEnvironment("AGENT_GRAPH_CLAUDE_COMMAND", "claude")
): CommandInvocation {
  const args = ["-p", request.prompt, "--output-format", "stream-json"];

  if (request.model) args.push("--model", request.model);
  if (request.mode === "plan") args.push("--permission-mode", "plan");
  if (request.sessionId) args.push("--resume", request.sessionId);

  return { command, args };
}

export function buildCodexInvocation(
  request: AgentRunRequest,
  command = commandFromEnvironment("AGENT_GRAPH_CODEX_COMMAND", "codex")
): CommandInvocation {
  const sandbox = request.mode === "implement" ? "workspace-write" : "read-only";
  const args = ["exec", "--json", "--sandbox", sandbox];

  if (request.model) args.push("--model", request.model);
  if (request.sessionId) args.push("resume", request.sessionId);
  args.push(request.prompt);

  return { command, args };
}

export function buildOpenCodeInvocation(
  request: AgentRunRequest,
  command = commandFromEnvironment("AGENT_GRAPH_OPENCODE_COMMAND", "opencode")
): CommandInvocation {
  const args = ["run", "--format", "json", "--dir", request.cwd];

  if (request.serverUrl) args.push("--attach", request.serverUrl);
  if (request.model) args.push("--model", request.model);
  if (request.agent) args.push("--agent", request.agent);
  if (request.sessionId) args.push("--session", request.sessionId);
  args.push(request.prompt);

  return { command, args };
}

abstract class CliAgentAdapter implements AgentAdapter {
  abstract readonly name: AgentAdapter["name"];

  protected abstract invocation(request: AgentRunRequest): CommandInvocation;

  async isAvailable(): Promise<boolean> {
    return commandAvailable(this.invocation({
      prompt: "availability check",
      cwd: process.cwd(),
      mode: "plan"
    }).command);
  }

  run(request: AgentRunRequest, onEvent?: AgentEventHandler): Promise<AgentRunResult> {
    return runInvocation(this.name, this.invocation(request), request, onEvent);
  }
}

export class ClaudeAdapter extends CliAgentAdapter {
  readonly name = "claude" as const;

  protected invocation(request: AgentRunRequest): CommandInvocation {
    return buildClaudeInvocation(request);
  }
}

export class CodexAdapter extends CliAgentAdapter {
  readonly name = "codex" as const;

  protected invocation(request: AgentRunRequest): CommandInvocation {
    return buildCodexInvocation(request);
  }
}

export class OpenCodeAdapter extends CliAgentAdapter {
  readonly name = "opencode" as const;

  protected invocation(request: AgentRunRequest): CommandInvocation {
    return buildOpenCodeInvocation(request);
  }
}
