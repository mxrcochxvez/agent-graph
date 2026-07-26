import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  addBatchNote,
  advanceBatch,
  canTransitionBatch,
  getBatchNext,
  recordBatchPlan,
  skipBatchAssignment
} from "../src/batch.js";
import { createBatch, getAssignment, getBatch } from "../src/store.js";
import {
  addAcceptanceCriterion,
  advanceAssignment,
  recordDelivery,
  recordReview,
  recordVerification
} from "../src/workflow.js";

async function withTempState(run: () => Promise<void>): Promise<void> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "agent-graph-batch-"));
  process.env.AGENT_GRAPH_STATE_DIR = directory;
  try {
    await run();
  } finally {
    delete process.env.AGENT_GRAPH_STATE_DIR;
    await rm(directory, { recursive: true, force: true });
  }
}

async function completeAssignment(id: string): Promise<void> {
  await advanceAssignment(id, "classify");
  await advanceAssignment(id, "context");
  await advanceAssignment(id, "outcome");
  await addAcceptanceCriterion(id, "Done");
  await advanceAssignment(id, "plan");
  await advanceAssignment(id, "implement");
  await advanceAssignment(id, "verify");
  await recordVerification(id, "npm test", "passed", "ok");
  await advanceAssignment(id, "review");
  await recordReview(id, "Looks good");
  await advanceAssignment(id, "deliver");
  await recordDelivery(id, "Ready");
  await advanceAssignment(id, "complete");
}

test("the batch graph exposes a planning loop and sequential execute loop", () => {
  assert.equal(canTransitionBatch("plan", "plan"), true);
  assert.equal(canTransitionBatch("plan", "execute"), true);
  assert.equal(canTransitionBatch("execute", "execute"), true);
  assert.equal(canTransitionBatch("intake", "execute"), false);
});

test("batch planning and sequential cursor", { concurrency: false }, async () => {
  await withTempState(async () => {
    const batch = await createBatch({
      id: "SPRINT-1",
      summary: "Two tickets",
      assignmentIds: ["ENG-A", "ENG-B", "ENG-C"]
    });
    assert.equal(batch.currentNode, "intake");
    assert.equal((await getAssignment("ENG-A")).currentNode, "intake");

    await advanceBatch("SPRINT-1", "plan");
    await assert.rejects(() => advanceBatch("SPRINT-1", "execute"), /plan summary/i);

    await recordBatchPlan("SPRINT-1", "A then B; C optional");
    await addBatchNote("SPRINT-1", "B depends on A API");

    await assert.rejects(
      () => advanceBatch("SPRINT-1", "plan"),
      /planning note explaining the revision/i
    );
    await advanceBatch("SPRINT-1", "plan", "Revised: still A then B");
    const revised = await getBatch("SPRINT-1");
    assert.ok(revised.planNotes.some((note) => note.includes("Revised")));

    await advanceBatch("SPRINT-1", "execute");
    const first = await getBatchNext("SPRINT-1");
    assert.equal(first.done, false);
    assert.equal(first.assignment?.id, "ENG-A");

    await assert.rejects(
      () => advanceBatch("SPRINT-1", "execute"),
      /Finish or skip assignment ENG-A/i
    );

    await completeAssignment("ENG-A");
    const second = await getBatchNext("SPRINT-1");
    assert.equal(second.assignment?.id, "ENG-B");

    await assert.rejects(() => advanceBatch("SPRINT-1", "complete"), /Complete or skip/i);

    await skipBatchAssignment("SPRINT-1", "ENG-C", "Deferred");
    await completeAssignment("ENG-B");

    const afterB = await getBatchNext("SPRINT-1");
    assert.equal(afterB.done, true);
    assert.equal(afterB.assignment, null);

    const completed = await advanceBatch("SPRINT-1", "complete");
    assert.equal(completed.currentNode, "complete");
    assert.deepEqual(completed.skippedAssignmentIds, ["ENG-C"]);
  });
});
