#!/usr/bin/env node

import { listAgentProviders, parseAgentProvider } from "./agents/registry.js";
import { AGENT_MODES, type AgentMode } from "./agents/types.js";
import { runAssignmentAgent } from "./runner.js";
import { createAssignment, getAssignment, listAssignments } from "./store.js";
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
  TASK_TYPES,
  VERIFICATION_STATUSES,
  WORKFLOW_NODES,
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
  run <id> <claude|codex|opencode> [--prompt <text>] [--cwd <path>]
      [--mode <plan|implement|review>] [--model <model>] [--agent <name>]
      [--attach <opencode-url>] [--session <id>] [--timeout <milliseconds>]
`;
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
