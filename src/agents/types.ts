export const AGENT_PROVIDERS = ["claude", "codex", "opencode", "antigravity"] as const;
export type AgentProvider = (typeof AGENT_PROVIDERS)[number];

export const AGENT_MODES = ["plan", "implement", "review"] as const;
export type AgentMode = (typeof AGENT_MODES)[number];

export interface AgentRunRequest {
  prompt: string;
  cwd: string;
  mode: AgentMode;
  model?: string;
  agent?: string;
  serverUrl?: string;
  sessionId?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

export interface CommandInvocation {
  command: string;
  args: string[];
}

export interface AgentRunResult {
  provider: AgentProvider;
  command: string;
  args: string[];
  success: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  startedAt: string;
  finishedAt: string;
}

export type AgentRunEvent =
  | {
      type: "started";
      provider: AgentProvider;
      command: string;
      args: string[];
      at: string;
    }
  | { type: "stdout"; provider: AgentProvider; data: string }
  | { type: "stderr"; provider: AgentProvider; data: string }
  | { type: "completed"; provider: AgentProvider; result: AgentRunResult };

export type AgentEventHandler = (event: AgentRunEvent) => void;

export interface AgentAdapter {
  readonly name: AgentProvider;
  isAvailable(): Promise<boolean>;
  run(request: AgentRunRequest, onEvent?: AgentEventHandler): Promise<AgentRunResult>;
}
