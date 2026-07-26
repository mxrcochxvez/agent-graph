import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { listAgentProviders } from "./agents/registry.js";
import { AGENT_MODES, AGENT_PROVIDERS } from "./agents/types.js";
import {
  addBatchNote,
  advanceBatch,
  getBatchNext,
  recordBatchPlan,
  skipBatchAssignment
} from "./batch.js";
import { runAssignmentAgent } from "./runner.js";
import {
  createAssignment,
  createBatch,
  getAssignment,
  getBatch,
  listAssignments,
  listBatches
} from "./store.js";
import {
  addAcceptanceCriterion,
  addAssumption,
  addNote,
  advanceAssignment,
  recordDelivery,
  recordReview,
  recordVerification
} from "./workflow.js";
import { BATCH_NODES, TASK_TYPES, VERIFICATION_STATUSES, WORKFLOW_NODES } from "./types.js";

function textResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }]
  };
}

const server = new McpServer(
  { name: "agent-graph", version: "0.2.0" },
  {
    instructions:
      "Use this server to track substantial software assignments from intake through completion. Start an assignment, record acceptance criteria, advance one valid node at a time, record executable verification evidence, complete an independent review, and record delivery evidence. Failed verification or blocking review findings should return the assignment to implement. For multiple tickets, start a batch, use the batch planning loop (record_batch_plan / add_batch_note / advance_batch plan→plan) until the plan is solid, advance the batch to execute, then repeatedly call get_batch_next and run the full assignment graph on that single current ticket before moving on. The run_assignment_agent tool can delegate a tracked assignment to Claude Code, Codex, or OpenCode; choose a different worker when independent planning or review is useful."
  }
);

server.registerTool(
  "start_assignment",
  {
    title: "Start assignment",
    description: "Create a new software assignment at the intake node.",
    inputSchema: {
      id: z.string().min(1),
      type: z.enum([...TASK_TYPES]).optional(),
      summary: z.string().optional(),
      branch: z.string().optional()
    }
  },
  async (input) => textResult(await createAssignment(input))
);

server.registerTool(
  "get_assignment",
  {
    title: "Get assignment",
    description: "Read the complete current state and evidence for one assignment.",
    inputSchema: { id: z.string().min(1) },
    annotations: { readOnlyHint: true }
  },
  async ({ id }) => textResult(await getAssignment(id))
);

server.registerTool(
  "list_assignments",
  {
    title: "List assignments",
    description: "List locally tracked assignments ordered by most recently updated.",
    inputSchema: {},
    annotations: { readOnlyHint: true }
  },
  async () => textResult(await listAssignments())
);

server.registerTool(
  "list_agent_providers",
  {
    title: "List agent providers",
    description:
      "Check whether the Claude Code, Codex, OpenCode, and Antigravity (agy) CLIs are available.",
    inputSchema: {},
    annotations: { readOnlyHint: true }
  },
  async () => textResult(await listAgentProviders())
);

server.registerTool(
  "run_assignment_agent",
  {
    title: "Run assignment with an agent",
    description:
      "Delegate a tracked assignment to Claude Code, Codex, OpenCode, or Antigravity. The selected CLI runs in the requested working directory and the result is recorded in assignment history.",
    inputSchema: {
      id: z.string().min(1),
      provider: z.enum([...AGENT_PROVIDERS]),
      prompt: z.string().optional(),
      cwd: z.string().optional(),
      mode: z.enum([...AGENT_MODES]).optional(),
      model: z.string().optional(),
      agent: z.string().optional(),
      serverUrl: z.string().url().optional(),
      sessionId: z.string().optional(),
      timeoutMs: z.number().int().positive().optional()
    }
  },
  async (input) => textResult(await runAssignmentAgent(input))
);

server.registerTool(
  "advance_assignment",
  {
    title: "Advance assignment",
    description:
      "Move an assignment to one valid next node. Graph guards reject missing acceptance criteria, failed verification, or missing review and delivery evidence.",
    inputSchema: {
      id: z.string().min(1),
      to: z.enum([...WORKFLOW_NODES]),
      note: z.string().optional()
    }
  },
  async ({ id, to, note }) => textResult(await advanceAssignment(id, to, note))
);

server.registerTool(
  "add_acceptance_criterion",
  {
    title: "Add acceptance criterion",
    description: "Add one observable condition that must be true for the assignment to be done.",
    inputSchema: { id: z.string().min(1), criterion: z.string().min(1) }
  },
  async ({ id, criterion }) => textResult(await addAcceptanceCriterion(id, criterion))
);

server.registerTool(
  "add_assumption",
  {
    title: "Add assumption",
    description: "Record an explicit assumption that affects implementation or scope.",
    inputSchema: { id: z.string().min(1), assumption: z.string().min(1) }
  },
  async ({ id, assumption }) => textResult(await addAssumption(id, assumption))
);

server.registerTool(
  "add_note",
  {
    title: "Add assignment note",
    description: "Record context, a decision, risk, blocker, or repair-loop explanation.",
    inputSchema: { id: z.string().min(1), note: z.string().min(1) }
  },
  async ({ id, note }) => textResult(await addNote(id, note))
);

server.registerTool(
  "record_verification",
  {
    title: "Record verification",
    description:
      "Record the result of a named test, type check, lint, build, or manual verification step.",
    inputSchema: {
      id: z.string().min(1),
      name: z.string().min(1),
      status: z.enum([...VERIFICATION_STATUSES]),
      details: z.string().optional()
    }
  },
  async ({ id, name, status, details }) =>
    textResult(await recordVerification(id, name, status, details))
);

server.registerTool(
  "record_review",
  {
    title: "Record independent review",
    description: "Record the final diff review and any findings before delivery.",
    inputSchema: { id: z.string().min(1), summary: z.string().min(1) }
  },
  async ({ id, summary }) => textResult(await recordReview(id, summary))
);

server.registerTool(
  "record_delivery",
  {
    title: "Record delivery",
    description:
      "Record the PR-ready implementation summary, verification results, known risks, and remaining steps.",
    inputSchema: { id: z.string().min(1), summary: z.string().min(1) }
  },
  async ({ id, summary }) => textResult(await recordDelivery(id, summary))
);

server.registerTool(
  "start_batch",
  {
    title: "Start batch",
    description:
      "Create a batch that groups ordered assignment IDs. Missing assignments are created at intake.",
    inputSchema: {
      id: z.string().min(1),
      assignmentIds: z.array(z.string().min(1)).min(1),
      summary: z.string().optional(),
      type: z.enum([...TASK_TYPES]).optional()
    }
  },
  async (input) => textResult(await createBatch(input))
);

server.registerTool(
  "get_batch",
  {
    title: "Get batch",
    description: "Read the complete current state for one batch.",
    inputSchema: { id: z.string().min(1) },
    annotations: { readOnlyHint: true }
  },
  async ({ id }) => textResult(await getBatch(id))
);

server.registerTool(
  "list_batches",
  {
    title: "List batches",
    description: "List locally tracked batches ordered by most recently updated.",
    inputSchema: {},
    annotations: { readOnlyHint: true }
  },
  async () => textResult(await listBatches())
);

server.registerTool(
  "advance_batch",
  {
    title: "Advance batch",
    description:
      "Move a batch to one valid next node. Use plan→plan with a note for the planning loop. Execute requires a plan summary. Complete requires every assignment to be complete or skipped.",
    inputSchema: {
      id: z.string().min(1),
      to: z.enum([...BATCH_NODES]),
      note: z.string().optional()
    }
  },
  async ({ id, to, note }) => textResult(await advanceBatch(id, to, note))
);

server.registerTool(
  "record_batch_plan",
  {
    title: "Record batch plan",
    description: "Record the batch-level plan summary required before execute.",
    inputSchema: { id: z.string().min(1), summary: z.string().min(1) }
  },
  async ({ id, summary }) => textResult(await recordBatchPlan(id, summary))
);

server.registerTool(
  "add_batch_note",
  {
    title: "Add batch plan note",
    description: "Record planning context, ordering decisions, risks, or revision rationale.",
    inputSchema: { id: z.string().min(1), note: z.string().min(1) }
  },
  async ({ id, note }) => textResult(await addBatchNote(id, note))
);

server.registerTool(
  "get_batch_next",
  {
    title: "Get next batch assignment",
    description:
      "Return the current incomplete assignment for a batch in execute. Call this after finishing or skipping a ticket to pick up the next one.",
    inputSchema: { id: z.string().min(1) }
  },
  async ({ id }) => textResult(await getBatchNext(id))
);

server.registerTool(
  "skip_batch_assignment",
  {
    title: "Skip batch assignment",
    description:
      "Mark an assignment in the batch as skipped so the sequential loop can continue without completing it.",
    inputSchema: {
      id: z.string().min(1),
      assignmentId: z.string().min(1),
      reason: z.string().optional()
    }
  },
  async ({ id, assignmentId, reason }) =>
    textResult(await skipBatchAssignment(id, assignmentId, reason))
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("agent-graph MCP server running on stdio");
