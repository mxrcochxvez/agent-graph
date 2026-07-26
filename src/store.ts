import { mkdir, readFile, readdir, rename, writeFile, stat } from "node:fs/promises";
import path from "node:path";

import type {
  Assignment,
  Batch,
  StartAssignmentInput,
  StartBatchInput
} from "./types.js";

function stateDirectory(): string {
  return path.resolve(
    process.env.AGENT_GRAPH_STATE_DIR ?? path.join(process.cwd(), ".agent", "state")
  );
}

function batchesDirectory(): string {
  return path.join(stateDirectory(), "batches");
}

export function safeId(id: string): string {
  const normalized = id.trim();
  if (!normalized || !/^[A-Za-z0-9._-]+$/.test(normalized)) {
    throw new Error("IDs may contain only letters, numbers, dots, underscores, and hyphens.");
  }
  return normalized;
}

function assignmentPath(id: string): string {
  return path.join(stateDirectory(), `${safeId(id)}.json`);
}

function batchPath(id: string): string {
  return path.join(batchesDirectory(), `${safeId(id)}.json`);
}

async function ensureStateDirectory(): Promise<void> {
  await mkdir(stateDirectory(), { recursive: true });
}

async function ensureBatchesDirectory(): Promise<void> {
  await mkdir(batchesDirectory(), { recursive: true });
}

async function writeJsonAtomic(destination: string, value: unknown): Promise<void> {
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, destination);
}

export async function createAssignment(input: StartAssignmentInput): Promise<Assignment> {
  const id = safeId(input.id);
  try {
    await getAssignment(id);
    throw new Error(`Assignment ${id} already exists.`);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Assignment not found:")) {
      throw error;
    }
  }

  const now = new Date().toISOString();
  const assignment: Assignment = {
    id,
    type: input.type ?? "other",
    summary: input.summary?.trim() || id,
    branch: input.branch?.trim() || undefined,
    currentNode: "intake",
    acceptanceCriteria: [],
    assumptions: [],
    notes: [],
    verification: {},
    agentRuns: [],
    createdAt: now,
    updatedAt: now,
    history: [{ to: "intake", at: now, note: "Assignment created" }]
  };

  await saveAssignment(assignment);
  return assignment;
}

export async function getAssignment(id: string): Promise<Assignment> {
  await ensureStateDirectory();
  try {
    const raw = await readFile(assignmentPath(id), "utf8");
    return JSON.parse(raw) as Assignment;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(`Assignment not found: ${safeId(id)}`);
    }
    throw error;
  }
}

export async function listAssignments(): Promise<Assignment[]> {
  await ensureStateDirectory();
  const entries = await readdir(stateDirectory());
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const fullPath = path.join(stateDirectory(), entry);
    const info = await stat(fullPath);
    if (info.isFile()) files.push(entry);
  }

  const assignments = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(stateDirectory(), file), "utf8");
      return JSON.parse(raw) as Assignment;
    })
  );

  return assignments.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function saveAssignment(assignment: Assignment): Promise<void> {
  await ensureStateDirectory();
  assignment.updatedAt = new Date().toISOString();
  await writeJsonAtomic(assignmentPath(assignment.id), assignment);
}

export async function createBatch(input: StartBatchInput): Promise<Batch> {
  const id = safeId(input.id);
  try {
    await getBatch(id);
    throw new Error(`Batch ${id} already exists.`);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Batch not found:")) {
      throw error;
    }
  }

  const assignmentIds = [...new Set(input.assignmentIds.map((value) => safeId(value)))];
  if (assignmentIds.length === 0) {
    throw new Error("A batch requires at least one assignment ID.");
  }

  for (const assignmentId of assignmentIds) {
    try {
      await getAssignment(assignmentId);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("Assignment not found:")) {
        throw error;
      }
      await createAssignment({
        id: assignmentId,
        type: input.type ?? "other",
        summary: assignmentId
      });
    }
  }

  const now = new Date().toISOString();
  const batch: Batch = {
    id,
    summary: input.summary?.trim() || id,
    assignmentIds,
    skippedAssignmentIds: [],
    currentNode: "intake",
    planNotes: [],
    createdAt: now,
    updatedAt: now,
    history: [{ to: "intake", at: now, note: "Batch created" }]
  };

  await saveBatch(batch);
  return batch;
}

export async function getBatch(id: string): Promise<Batch> {
  await ensureBatchesDirectory();
  try {
    const raw = await readFile(batchPath(id), "utf8");
    return JSON.parse(raw) as Batch;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(`Batch not found: ${safeId(id)}`);
    }
    throw error;
  }
}

export async function listBatches(): Promise<Batch[]> {
  await ensureBatchesDirectory();
  const files = (await readdir(batchesDirectory())).filter((file) => file.endsWith(".json"));
  const batches = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(batchesDirectory(), file), "utf8");
      return JSON.parse(raw) as Batch;
    })
  );

  return batches.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function saveBatch(batch: Batch): Promise<void> {
  await ensureBatchesDirectory();
  batch.updatedAt = new Date().toISOString();
  await writeJsonAtomic(batchPath(batch.id), batch);
}

export async function findNextIncompleteAssignmentId(
  batch: Batch
): Promise<string | undefined> {
  const skipped = new Set(batch.skippedAssignmentIds);
  for (const assignmentId of batch.assignmentIds) {
    if (skipped.has(assignmentId)) continue;
    const assignment = await getAssignment(assignmentId);
    if (assignment.currentNode !== "complete") {
      return assignmentId;
    }
  }
  return undefined;
}

export async function allBatchAssignmentsSettled(batch: Batch): Promise<boolean> {
  const skipped = new Set(batch.skippedAssignmentIds);
  for (const assignmentId of batch.assignmentIds) {
    if (skipped.has(assignmentId)) continue;
    const assignment = await getAssignment(assignmentId);
    if (assignment.currentNode !== "complete") {
      return false;
    }
  }
  return true;
}
