#!/usr/bin/env node

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
