import { getAssignment, saveAssignment } from "./store.js";
import type {
  AgentRunRecord,
  Assignment,
  VerificationStatus,
  WorkflowNode
} from "./types.js";

export const TRANSITIONS: Readonly<Record<WorkflowNode, readonly WorkflowNode[]>> = {
  intake: ["classify"],
  classify: ["context"],
  context: ["outcome"],
  outcome: ["plan"],
  plan: ["implement"],
  implement: ["verify"],
  verify: ["review", "implement"],
  review: ["deliver", "implement"],
  deliver: ["complete"],
  complete: []
};

export function canTransition(from: WorkflowNode, to: WorkflowNode): boolean {
  return TRANSITIONS[from].includes(to);
}

function assertGuard(assignment: Assignment, to: WorkflowNode): void {
  if (assignment.currentNode === "outcome" && to === "plan") {
    if (assignment.acceptanceCriteria.length === 0) {
      throw new Error("Add at least one acceptance criterion before planning.");
    }
  }

  if (assignment.currentNode === "verify" && to === "review") {
    const checks = Object.values(assignment.verification);
    if (!checks.some((check) => check.status === "passed")) {
      throw new Error("Record at least one passing verification before review.");
    }
    if (checks.some((check) => check.status === "failed")) {
      throw new Error("Resolve or rerun failing verification before review.");
    }
  }

  if (assignment.currentNode === "review" && to === "deliver" && !assignment.reviewSummary) {
    throw new Error("Record an independent review summary before delivery.");
  }

  if (assignment.currentNode === "deliver" && to === "complete" && !assignment.deliverySummary) {
    throw new Error("Record a delivery summary before completion.");
  }
}

export async function advanceAssignment(
  id: string,
  to: WorkflowNode,
  note?: string
): Promise<Assignment> {
  const assignment = await getAssignment(id);
  const from = assignment.currentNode;

  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }

  assertGuard(assignment, to);
  assignment.currentNode = to;
  assignment.history.push({
    from,
    to,
    at: new Date().toISOString(),
    note: note?.trim() || undefined
  });
  await saveAssignment(assignment);
  return assignment;
}

export async function addAcceptanceCriterion(id: string, criterion: string): Promise<Assignment> {
  const assignment = await getAssignment(id);
  const value = criterion.trim();
  if (!value) {
    throw new Error("Acceptance criterion cannot be empty.");
  }
  if (!assignment.acceptanceCriteria.includes(value)) {
    assignment.acceptanceCriteria.push(value);
  }
  await saveAssignment(assignment);
  return assignment;
}

export async function addAssumption(id: string, assumption: string): Promise<Assignment> {
  const assignment = await getAssignment(id);
  const value = assumption.trim();
  if (!value) {
    throw new Error("Assumption cannot be empty.");
  }
  assignment.assumptions.push(value);
  await saveAssignment(assignment);
  return assignment;
}

export async function addNote(id: string, note: string): Promise<Assignment> {
  const assignment = await getAssignment(id);
  const value = note.trim();
  if (!value) {
    throw new Error("Note cannot be empty.");
  }
  assignment.notes.push(value);
  await saveAssignment(assignment);
  return assignment;
}

export async function recordVerification(
  id: string,
  name: string,
  status: VerificationStatus,
  details?: string
): Promise<Assignment> {
  const assignment = await getAssignment(id);
  const checkName = name.trim();
  if (!checkName) {
    throw new Error("Verification name cannot be empty.");
  }

  assignment.verification[checkName] = {
    status,
    details: details?.trim() || undefined,
    recordedAt: new Date().toISOString()
  };
  await saveAssignment(assignment);
  return assignment;
}

export async function recordReview(id: string, summary: string): Promise<Assignment> {
  const assignment = await getAssignment(id);
  const value = summary.trim();
  if (!value) {
    throw new Error("Review summary cannot be empty.");
  }
  assignment.reviewSummary = value;
  await saveAssignment(assignment);
  return assignment;
}

export async function recordDelivery(id: string, summary: string): Promise<Assignment> {
  const assignment = await getAssignment(id);
  const value = summary.trim();
  if (!value) {
    throw new Error("Delivery summary cannot be empty.");
  }
  assignment.deliverySummary = value;
  await saveAssignment(assignment);
  return assignment;
}

export async function recordAgentRun(id: string, run: AgentRunRecord): Promise<Assignment> {
  const assignment = await getAssignment(id);
  assignment.agentRuns ??= [];
  assignment.agentRuns.push(run);
  await saveAssignment(assignment);
  return assignment;
}
