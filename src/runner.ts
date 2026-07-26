import path from "node:path";

import { getAgentAdapter } from "./agents/registry.js";
import type {
  AgentEventHandler,
  AgentMode,
  AgentProvider,
  AgentRunResult
} from "./agents/types.js";
import { getAssignment } from "./store.js";
import type { Assignment } from "./types.js";
import { recordAgentRun } from "./workflow.js";

export interface RunAssignmentAgentInput {
  id: string;
  provider: AgentProvider;
  prompt?: string;
  cwd?: string;
  mode?: AgentMode;
  model?: string;
  agent?: string;
  serverUrl?: string;
  sessionId?: string;
  timeoutMs?: number;
}

function inferredMode(assignment: Assignment): AgentMode {
  if (assignment.currentNode === "plan") return "plan";
  if (assignment.currentNode === "review") return "review";
  return "implement";
}

export function buildAssignmentPrompt(assignment: Assignment): string {
  const criteria = assignment.acceptanceCriteria.length
    ? assignment.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n")
    : "- No acceptance criteria have been recorded yet.";

  return [
    `Work on software assignment ${assignment.id}.`,
    `Task type: ${assignment.type}`,
    `Current workflow node: ${assignment.currentNode}`,
    `Summary: ${assignment.summary}`,
    assignment.branch ? `Expected branch: ${assignment.branch}` : undefined,
    "Acceptance criteria:",
    criteria,
    "Follow AGENTS.md. Use the agent-graph MCP tools or agentctl to record decisions, verification, review, and delivery evidence as the assignment progresses. Do not bypass repository safety rules or push directly to a protected branch."
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function outputSummary(result: AgentRunResult): string | undefined {
  const output = (result.stdout.trim() || result.stderr.trim()).replace(/\s+/g, " ");
  if (!output) return undefined;
  return output.length > 2000 ? `${output.slice(0, 1997)}...` : output;
}

export async function runAssignmentAgent(
  input: RunAssignmentAgentInput,
  onEvent?: AgentEventHandler
): Promise<AgentRunResult> {
  const assignment = await getAssignment(input.id);
  const adapter = getAgentAdapter(input.provider);

  if (!(await adapter.isAvailable())) {
    throw new Error(
      `${input.provider} CLI is not available. Install it or configure its command with the matching AGENT_GRAPH_*_COMMAND environment variable.`
    );
  }

  const mode = input.mode ?? inferredMode(assignment);
  const result = await adapter.run(
    {
      prompt: input.prompt?.trim() || buildAssignmentPrompt(assignment),
      cwd: path.resolve(input.cwd ?? process.cwd()),
      mode,
      model: input.model?.trim() || undefined,
      agent: input.agent?.trim() || undefined,
      serverUrl: input.serverUrl?.trim() || undefined,
      sessionId: input.sessionId?.trim() || undefined,
      timeoutMs: input.timeoutMs
    },
    onEvent
  );

  await recordAgentRun(input.id, {
    provider: input.provider,
    mode,
    model: input.model?.trim() || undefined,
    success: result.success,
    exitCode: result.exitCode,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    outputSummary: outputSummary(result)
  });

  return result;
}
