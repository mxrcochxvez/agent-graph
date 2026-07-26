export const WORKFLOW_NODES = [
  "intake",
  "classify",
  "context",
  "outcome",
  "plan",
  "implement",
  "verify",
  "review",
  "deliver",
  "complete"
] as const;

export type WorkflowNode = (typeof WORKFLOW_NODES)[number];

export const TASK_TYPES = [
  "feature",
  "bugfix",
  "investigation",
  "refactor",
  "documentation",
  "review",
  "other"
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const VERIFICATION_STATUSES = ["passed", "failed", "skipped"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface VerificationRecord {
  status: VerificationStatus;
  details?: string;
  recordedAt: string;
}

export interface HistoryEntry {
  from?: WorkflowNode;
  to: WorkflowNode;
  at: string;
  note?: string;
}

export interface Assignment {
  id: string;
  type: TaskType;
  summary: string;
  branch?: string;
  currentNode: WorkflowNode;
  acceptanceCriteria: string[];
  assumptions: string[];
  notes: string[];
  verification: Record<string, VerificationRecord>;
  reviewSummary?: string;
  deliverySummary?: string;
  createdAt: string;
  updatedAt: string;
  history: HistoryEntry[];
}

export interface StartAssignmentInput {
  id: string;
  type?: TaskType;
  summary?: string;
  branch?: string;
}
