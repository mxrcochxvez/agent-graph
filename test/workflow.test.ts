import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createAssignment } from "../src/store.js";
import {
  addAcceptanceCriterion,
  advanceAssignment,
  canTransition,
  recordDelivery,
  recordReview,
  recordVerification
} from "../src/workflow.js";

test("the graph exposes only intended repair loops", () => {
  assert.equal(canTransition("implement", "verify"), true);
  assert.equal(canTransition("verify", "implement"), true);
  assert.equal(canTransition("review", "implement"), true);
  assert.equal(canTransition("plan", "deliver"), false);
});

test("an assignment requires evidence before completion", { concurrency: false }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "agent-graph-"));
  process.env.AGENT_GRAPH_STATE_DIR = directory;

  try {
    await createAssignment({ id: "ENG-1", type: "feature", summary: "Test workflow" });
    await advanceAssignment("ENG-1", "classify");
    await advanceAssignment("ENG-1", "context");
    await advanceAssignment("ENG-1", "outcome");

    await assert.rejects(() => advanceAssignment("ENG-1", "plan"), /acceptance criterion/i);

    await addAcceptanceCriterion("ENG-1", "The workflow reaches complete with evidence");
    await advanceAssignment("ENG-1", "plan");
    await advanceAssignment("ENG-1", "implement");
    await advanceAssignment("ENG-1", "verify");

    await assert.rejects(() => advanceAssignment("ENG-1", "review"), /passing verification/i);

    await recordVerification("ENG-1", "npm test", "passed", "2 tests passed");
    await advanceAssignment("ENG-1", "review");
    await recordReview("ENG-1", "Final diff reviewed; no blocking findings.");
    await advanceAssignment("ENG-1", "deliver");
    await recordDelivery("ENG-1", "Implementation and verification evidence are ready.");
    const completed = await advanceAssignment("ENG-1", "complete");

    assert.equal(completed.currentNode, "complete");
  } finally {
    delete process.env.AGENT_GRAPH_STATE_DIR;
    await rm(directory, { recursive: true, force: true });
  }
});
