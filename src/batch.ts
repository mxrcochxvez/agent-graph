import {
  allBatchAssignmentsSettled,
  findNextIncompleteAssignmentId,
  getAssignment,
  getBatch,
  saveBatch
} from "./store.js";
import type { Assignment, Batch, BatchNode } from "./types.js";

export const BATCH_TRANSITIONS: Readonly<Record<BatchNode, readonly BatchNode[]>> = {
  intake: ["plan"],
  plan: ["plan", "execute"],
  execute: ["execute", "complete"],
  complete: []
};

export function canTransitionBatch(from: BatchNode, to: BatchNode): boolean {
  return BATCH_TRANSITIONS[from].includes(to);
}

async function assertBatchGuard(batch: Batch, to: BatchNode, note?: string): Promise<void> {
  if (batch.currentNode === "intake" && to === "plan") {
    if (batch.assignmentIds.length === 0) {
      throw new Error("A batch requires at least one assignment before planning.");
    }
  }

  if (batch.currentNode === "plan" && to === "plan") {
    if (!note?.trim()) {
      throw new Error("Record a planning note explaining the revision before looping on plan.");
    }
  }

  if (batch.currentNode === "plan" && to === "execute") {
    if (!batch.planSummary?.trim()) {
      throw new Error("Record a batch plan summary before execute.");
    }
  }

  if (batch.currentNode === "execute" && to === "execute") {
    const currentId = batch.currentAssignmentId;
    if (currentId) {
      const skipped = new Set(batch.skippedAssignmentIds);
      if (!skipped.has(currentId)) {
        const current = await getAssignment(currentId);
        if (current.currentNode !== "complete") {
          throw new Error(
            `Finish or skip assignment ${currentId} before advancing the batch to the next ticket.`
          );
        }
      }
    }
  }

  if (to === "complete") {
    if (!(await allBatchAssignmentsSettled(batch))) {
      throw new Error(
        "Complete or skip every assignment in the batch before marking the batch complete."
      );
    }
  }
}

export async function advanceBatch(
  id: string,
  to: BatchNode,
  note?: string
): Promise<Batch> {
  const batch = await getBatch(id);
  const from = batch.currentNode;

  if (!canTransitionBatch(from, to)) {
    throw new Error(`Invalid batch transition: ${from} -> ${to}`);
  }

  await assertBatchGuard(batch, to, note);

  if (to === "execute") {
    const nextId = await findNextIncompleteAssignmentId(batch);
    batch.currentAssignmentId = nextId;
  }

  if (to === "complete") {
    batch.currentAssignmentId = undefined;
  }

  batch.currentNode = to;
  batch.history.push({
    from,
    to,
    at: new Date().toISOString(),
    note: note?.trim() || undefined
  });

  if (from === "plan" && to === "plan" && note?.trim()) {
    batch.planNotes.push(note.trim());
  }

  await saveBatch(batch);
  return batch;
}

export async function recordBatchPlan(id: string, summary: string): Promise<Batch> {
  const batch = await getBatch(id);
  const value = summary.trim();
  if (!value) {
    throw new Error("Batch plan summary cannot be empty.");
  }
  batch.planSummary = value;
  await saveBatch(batch);
  return batch;
}

export async function addBatchNote(id: string, note: string): Promise<Batch> {
  const batch = await getBatch(id);
  const value = note.trim();
  if (!value) {
    throw new Error("Batch plan note cannot be empty.");
  }
  batch.planNotes.push(value);
  await saveBatch(batch);
  return batch;
}

export async function skipBatchAssignment(
  id: string,
  assignmentId: string,
  reason?: string
): Promise<Batch> {
  const batch = await getBatch(id);
  if (batch.currentNode === "complete") {
    throw new Error("Cannot skip assignments on a completed batch.");
  }
  if (!batch.assignmentIds.includes(assignmentId)) {
    throw new Error(`Assignment ${assignmentId} is not part of batch ${id}.`);
  }

  if (!batch.skippedAssignmentIds.includes(assignmentId)) {
    batch.skippedAssignmentIds.push(assignmentId);
  }

  if (batch.currentAssignmentId === assignmentId) {
    batch.currentAssignmentId = await findNextIncompleteAssignmentId(batch);
  }

  batch.history.push({
    from: batch.currentNode,
    to: batch.currentNode,
    at: new Date().toISOString(),
    note: reason?.trim()
      ? `Skipped ${assignmentId}: ${reason.trim()}`
      : `Skipped ${assignmentId}`
  });

  await saveBatch(batch);
  return batch;
}

export interface BatchNextResult {
  batch: Batch;
  assignment: Assignment | null;
  done: boolean;
}

export async function getBatchNext(id: string): Promise<BatchNextResult> {
  const batch = await getBatch(id);

  if (batch.currentNode === "complete") {
    return { batch, assignment: null, done: true };
  }

  if (batch.currentNode !== "execute") {
    throw new Error(
      `Batch ${id} is at ${batch.currentNode}; advance to execute before requesting the next assignment.`
    );
  }

  let nextId = batch.currentAssignmentId;
  if (nextId) {
    const skipped = new Set(batch.skippedAssignmentIds);
    if (skipped.has(nextId)) {
      nextId = undefined;
    } else {
      const current = await getAssignment(nextId);
      if (current.currentNode === "complete") {
        nextId = undefined;
      }
    }
  }

  if (!nextId) {
    nextId = await findNextIncompleteAssignmentId(batch);
    batch.currentAssignmentId = nextId;
    await saveBatch(batch);
  }

  if (!nextId) {
    return { batch, assignment: null, done: true };
  }

  return {
    batch,
    assignment: await getAssignment(nextId),
    done: false
  };
}
