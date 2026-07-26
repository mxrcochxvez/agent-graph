import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClaudeInvocation,
  buildCodexInvocation,
  buildOpenCodeInvocation
} from "../src/agents/adapters.js";
import { parseAgentProvider } from "../src/agents/registry.js";
import type { AgentRunRequest } from "../src/agents/types.js";

function request(overrides: Partial<AgentRunRequest> = {}): AgentRunRequest {
  return {
    prompt: "Implement the assignment",
    cwd: "/workspace/project",
    mode: "implement",
    ...overrides
  };
}

test("Claude uses print mode and plan permissions without bypassing safety", () => {
  const invocation = buildClaudeInvocation(
    request({ mode: "plan", model: "sonnet", sessionId: "claude-session" }),
    "claude-test"
  );

  assert.equal(invocation.command, "claude-test");
  assert.deepEqual(invocation.args, [
    "-p",
    "Implement the assignment",
    "--output-format",
    "stream-json",
    "--model",
    "sonnet",
    "--permission-mode",
    "plan",
    "--resume",
    "claude-session"
  ]);
  assert.equal(invocation.args.includes("--dangerously-skip-permissions"), false);
});

test("Codex uses a writable sandbox only for implementation", () => {
  const implementation = buildCodexInvocation(request(), "codex-test");
  const review = buildCodexInvocation(request({ mode: "review" }), "codex-test");

  assert.deepEqual(implementation.args, [
    "exec",
    "--json",
    "--sandbox",
    "workspace-write",
    "Implement the assignment"
  ]);
  assert.deepEqual(review.args, [
    "exec",
    "--json",
    "--sandbox",
    "read-only",
    "Implement the assignment"
  ]);
});

test("OpenCode can attach to the server shared with OpenChamber", () => {
  const invocation = buildOpenCodeInvocation(
    request({
      model: "opencode-go/example-model",
      agent: "build",
      serverUrl: "http://127.0.0.1:4096",
      sessionId: "session-123"
    }),
    "opencode-test"
  );

  assert.deepEqual(invocation.args, [
    "run",
    "--format",
    "json",
    "--dir",
    "/workspace/project",
    "--attach",
    "http://127.0.0.1:4096",
    "--model",
    "opencode-go/example-model",
    "--agent",
    "build",
    "--session",
    "session-123",
    "Implement the assignment"
  ]);
});

test("provider parsing is case insensitive and rejects unknown providers", () => {
  assert.equal(parseAgentProvider("OpenCode"), "opencode");
  assert.throws(() => parseAgentProvider("unknown"), /Invalid agent provider/);
});
