import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Assignment, StartAssignmentInput } from "./types.js";

function stateDirectory(): string {
  return path.resolve(
    process.env.AGENT_GRAPH_STATE_DIR ?? path.join(process.cwd(), ".agent", "state")
  );
}

function safeId(id: string): string {
  const normalized = id.trim();
  if (!normalized || !/^[A-Za-z0-9._-]+$/.test(normalized)) {
    throw new Error("Assignment IDs may contain only letters, numbers, dots, underscores, and hyphens.");
  }
  return normalized;
}

function assignmentPath(id: string): string {
  return path.join(stateDirectory(), `${safeId(id)}.json`);
}

async function ensureStateDirectory(): Promise<void> {
  await mkdir(stateDirectory(), { recursive: true });
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
  const files = (await readdir(stateDirectory())).filter((file) => file.endsWith(".json"));
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

  const destination = assignmentPath(assignment.id);
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(assignment, null, 2)}\n`, "utf8");
  await rename(temporary, destination);
}
