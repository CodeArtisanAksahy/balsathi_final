import assert from "node:assert/strict";
import test from "node:test";
import { createDemoData } from "./demo-data";
import { resetDemoStore } from "./demo-store";

test("demo data contains expected seeded records", () => {
  resetDemoStore();
  const data = createDemoData();
  assert.equal(data.centers.length, 2);
  assert.equal(data.users.length, 4);
  assert.equal(data.children.length, 4);
  assert.equal(data.observations.length, 4);
  assert.equal(data.milestoneDefinitions.length, 3);
});

test("worker is linked to center-1 children", () => {
  const data = createDemoData();
  const worker = data.users.find((u) => u.id === "worker-1");
  assert.ok(worker);
  assert.deepEqual(worker.centerIds, ["center-1"]);
  const workerChildren = data.children.filter((c) => c.centerId === "center-1");
  assert.equal(workerChildren.length, 3);
});

test("parent-1 is linked to child-1 and child-4 via guardian", () => {
  const data = createDemoData();
  const guardian = data.guardians.find((g) => g.linkedUserId === "parent-1");
  assert.ok(guardian);
  const childIds = data.childGuardians.filter((l) => l.guardianId === guardian.id).map((l) => l.childId);
  assert.ok(childIds.includes("child-1"));
  assert.ok(childIds.includes("child-4"));
});

test("risk assessment exists for child-2 with review required", () => {
  const data = createDemoData();
  const risks = data.riskAssessments.filter((r) => r.childId === "child-2");
  assert.ok(risks.some((r) => r.reviewRequired));
});
