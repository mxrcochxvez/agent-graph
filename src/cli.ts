#!/usr/bin/env node

import { listAgentProviders, parseAgentProvider } from "./agents/registry.js";
import { AGENT_MODES, type AgentMode } from "./agents/types.js";
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
import {
  BATCH_NODES,
  TASK_TYPES,
  VERIFICATION_STATUSES,
  WORKFLOW_NODES,
  type BatchNode,
  type TaskType,
  type VerificationStatus,
  type WorkflowNode
} from "./types.js";

function flagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

function flagValues(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== flag) continue;
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}.`);
    }
    values.push(value);
    index += 1;
  }
  return values;
}

function requireValue(value: string | undefined, label: string): string {
  if (!value?.trim()) throw new Error(`Missing ${label}.`);
  return value.trim();
}

function parseTaskType(value: string | undefined): TaskType {
  if (!value) return "other";
  if (!TASK_TYPES.includes(value as TaskType)) {
    throw new Error(`Invalid task type: ${value}. Expected one of: ${TASK_TYPES.join(", ")}`);
  }
  return value as TaskType;
}

function parseNode(value: string | undefined): WorkflowNode {
  const node = requireValue(value, "workflow node");
  if (!WORKFLOW_NODES.includes(node as WorkflowNode)) {
    throw new Error(`Invalid workflow node: ${node}`);
  }
  return node as WorkflowNode;
}

function parseBatchNode(value: string | undefined): BatchNode {
  const node = requireValue(value, "batch node");
  if (!BATCH_NODES.includes(node as BatchNode)) {
    throw new Error(`Invalid batch node: ${node}. Expected one of: ${BATCH_NODES.join(", ")}`);
  }
  return node as BatchNode;
}

function parseAgentMode(value: string | undefined): AgentMode | undefined {
  if (!value) return undefined;
  if (!AGENT_MODES.includes(value as AgentMode)) {
    throw new Error(`Invalid agent mode: ${value}. Expected one of: ${AGENT_MODES.join(", ")}`);
  }
  return value as AgentMode;
}

function parseTimeout(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const timeout = Number(value);
  if (!Number.isSafeInteger(timeout) || timeout <= 0) {
    throw new Error("Timeout must be a positive integer in milliseconds.");
  }
  return timeout;
}

function parseVerificationStatus(value: string | undefined): VerificationStatus {
  const status = requireValue(value, "verification status");
  if (!VERIFICATION_STATUSES.includes(status as VerificationStatus)) {
    throw new Error(
      `Invalid verification status: ${status}. Expected one of: ${VERIFICATION_STATUSES.join(", ")}`
    );
  }
  return status as VerificationStatus;
}

function parseAssignmentIds(args: string[]): string[] {
  const fromRepeated = flagValues(args, "--id");
  const fromCsv = flagValue(args, "--ids");
  const ids = [
    ...fromRepeated,
    ...(fromCsv ? fromCsv.split(",").map((value) => value.trim()).filter(Boolean) : [])
  ];
  if (ids.length === 0) {
    throw new Error("Provide assignment IDs with --ids A,B,C and/or repeated --id <id>.");
  }
  return ids;
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage(): string {
  return `agentctl commands:
  start <id> [--type <type>] [--summary <text>] [--branch <name>]
  status [id]
  advance <id> <node> [--note <text>]
  criteria <id> <criterion>
  assumption <id> <assumption>
  note <id> <note>
  verify <id> <check-name> <passed|failed|skipped> [--details <text>]
  review <id> <summary>
  deliver <id> <summary>
  finish <id>
  providers
  run <id> <claude|codex|opencode|antigravity> [--prompt <text>] [--cwd <path>]
      [--mode <plan|implement|review>] [--model <model>] [--agent <name>]
      [--attach <opencode-url>] [--session <id>] [--timeout <milliseconds>]
  batch start <id> --ids A,B,C [--id X] [--summary <text>] [--type <type>]
  batch status [id]
  batch plan <id> <summary>
  batch note <id> <note>
  batch advance <id> <intake|plan|execute|complete> [--note <text>]
  batch next <id>
  batch skip <id> <assignmentId> [--reason <text>]
`;
}

async function handleBatch(subcommand: string | undefined, rest: string[]): Promise<void> {
  switch (subcommand) {
    case "start": {
      const batchId = requireValue(rest[0], "batch ID");
      const options = rest.slice(1);
      print(
        await createBatch({
          id: batchId,
          summary: flagValue(options, "--summary"),
          assignmentIds: parseAssignmentIds(options),
          type: parseTaskType(flagValue(options, "--type"))
        })
      );
      return;
    }
    case "status": {
      print(rest[0] ? await getBatch(rest[0]) : await listBatches());
      return;
    }
    case "plan": {
      print(
        await recordBatchPlan(
          requireValue(rest[0], "batch ID"),
          requireValue(rest.slice(1).join(" "), "plan summary")
        )
      );
      return;
    }
    case "note": {
      print(
        await addBatchNote(
          requireValue(rest[0], "batch ID"),
          requireValue(rest.slice(1).join(" "), "plan note")
        )
      );
      return;
    }
    case "advance": {
      print(
        await advanceBatch(
          requireValue(rest[0], "batch ID"),
          parseBatchNode(rest[1]),
          flagValue(rest, "--note")
        )
      );
      return;
    }
    case "next": {
      print(await getBatchNext(requireValue(rest[0], "batch ID")));
      return;
    }
    case "skip": {
      print(
        await skipBatchAssignment(
          requireValue(rest[0], "batch ID"),
          requireValue(rest[1], "assignment ID"),
          flagValue(rest, "--reason")
        )
      );
      return;
    }
    case "help":
    case "--help":
    case "-h":
    case undefined:
      process.stdout.write(usage());
      return;
    default:
      throw new Error(`Unknown batch command: ${subcommand}\n\n${usage()}`);
  }
}

async function main(): Promise<void> {
  const [command, id, ...rest] = process.argv.slice(2);

  switch (command) {
    case "start": {
      const assignmentId = requireValue(id, "assignment ID");
      print(
        await createAssignment({
          id: assignmentId,
          type: parseTaskType(flagValue(rest, "--type")),
          summary: flagValue(rest, "--summary"),
          branch: flagValue(rest, "--branch")
        })
      );
      return;
    }
    case "status": {
      print(id ? await getAssignment(id) : await listAssignments());
      return;
    }
    case "advance": {
      const assignmentId = requireValue(id, "assignment ID");
      print(await advanceAssignment(assignmentId, parseNode(rest[0]), flagValue(rest, "--note")));
      return;
    }
    case "criteria": {
      print(
        await addAcceptanceCriterion(
          requireValue(id, "assignment ID"),
          requireValue(rest.join(" "), "acceptance criterion")
        )
      );
      return;
    }
    case "assumption": {
      print(
        await addAssumption(
          requireValue(id, "assignment ID"),
          requireValue(rest.join(" "), "assumption")
        )
      );
      return;
    }
    case "note": {
      print(
        await addNote(
          requireValue(id, "assignment ID"),
          requireValue(rest.join(" "), "note")
        )
      );
      return;
    }
    case "verify": {
      print(
        await recordVerification(
          requireValue(id, "assignment ID"),
          requireValue(rest[0], "verification name"),
          parseVerificationStatus(rest[1]),
          flagValue(rest, "--details")
        )
      );
      return;
    }
    case "review": {
      print(
        await recordReview(
          requireValue(id, "assignment ID"),
          requireValue(rest.join(" "), "review summary")
        )
      );
      return;
    }
    case "deliver": {
      print(
        await recordDelivery(
          requireValue(id, "assignment ID"),
          requireValue(rest.join(" "), "delivery summary")
        )
      );
      return;
    }
    case "finish": {
      print(await advanceAssignment(requireValue(id, "assignment ID"), "complete"));
      return;
    }
    case "providers": {
      print(await listAgentProviders());
      return;
    }
    case "run": {
      const assignmentId = requireValue(id, "assignment ID");
      const provider = parseAgentProvider(requireValue(rest[0], "agent provider"));
      const options = rest.slice(1);
      const result = await runAssignmentAgent(
        {
          id: assignmentId,
          provider,
          prompt: flagValue(options, "--prompt"),
          cwd: flagValue(options, "--cwd"),
          mode: parseAgentMode(flagValue(options, "--mode")),
          model: flagValue(options, "--model"),
          agent: flagValue(options, "--agent"),
          serverUrl: flagValue(options, "--attach"),
          sessionId: flagValue(options, "--session"),
          timeoutMs: parseTimeout(flagValue(options, "--timeout"))
        },
        (event) => {
          if (event.type === "started") {
            process.stderr.write(`[${event.provider}] started ${event.command}\n`);
          } else if (event.type === "stdout" || event.type === "stderr") {
            process.stderr.write(event.data);
          }
        }
      );

      print({ assignmentId, result });
      if (!result.success) process.exitCode = result.exitCode ?? 1;
      return;
    }
    case "batch": {
      await handleBatch(id, rest);
      return;
    }
    case "help":
    case "--help":
    case "-h":
    case undefined:
      process.stdout.write(usage());
      return;
    default:
      throw new Error(`Unknown command: ${command}\n\n${usage()}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`agentctl: ${message}\n`);
  process.exitCode = 1;
});
