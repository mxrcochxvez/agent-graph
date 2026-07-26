import { spawn } from "node:child_process";

import type {
  AgentEventHandler,
  AgentProvider,
  AgentRunRequest,
  AgentRunResult,
  CommandInvocation
} from "./types.js";

export async function commandAvailable(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"], {
      stdio: "ignore",
      shell: false
    });

    child.once("error", () => resolve(false));
    child.once("close", (code) => resolve(code === 0));
  });
}

export async function runInvocation(
  provider: AgentProvider,
  invocation: CommandInvocation,
  request: AgentRunRequest,
  onEvent?: AgentEventHandler
): Promise<AgentRunResult> {
  const startedAt = new Date().toISOString();
  onEvent?.({
    type: "started",
    provider,
    command: invocation.command,
    args: invocation.args,
    at: startedAt
  });

  return new Promise((resolve) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: request.cwd,
      env: { ...process.env, ...request.env },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let spawnError: Error | undefined;
    let timedOut = false;

    const timeout = request.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, request.timeoutMs)
      : undefined;

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (data: string) => {
      stdout += data;
      onEvent?.({ type: "stdout", provider, data });
    });

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (data: string) => {
      stderr += data;
      onEvent?.({ type: "stderr", provider, data });
    });

    child.once("error", (error) => {
      spawnError = error;
    });

    child.once("close", (exitCode, signal) => {
      if (timeout) clearTimeout(timeout);

      if (spawnError) {
        stderr += `${stderr ? "\n" : ""}${spawnError.message}`;
      }
      if (timedOut) {
        stderr += `${stderr ? "\n" : ""}Agent run exceeded ${request.timeoutMs}ms and was terminated.`;
      }

      const result: AgentRunResult = {
        provider,
        command: invocation.command,
        args: invocation.args,
        success: !spawnError && !timedOut && exitCode === 0,
        exitCode,
        signal,
        stdout,
        stderr,
        startedAt,
        finishedAt: new Date().toISOString()
      };

      onEvent?.({ type: "completed", provider, result });
      resolve(result);
    });
  });
}
