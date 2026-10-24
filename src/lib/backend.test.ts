import assert from "node:assert/strict";
import test from "node:test";
import { createDemoData } from "./demo-data";
import { resetDemoStore } from "./demo-store";
import { assertChildAccess, getAuthorizedChildren } from "./data";
import { getRecentObservationChildren } from "./selectors";
import { resolveProfileChildId } from "./child-profile-utils";
import { verifyPassword } from "./auth";
import type { SessionUser } from "./domain";

function sessionFor(userId: string): SessionUser {
  const user = createDemoData().users.find((candidate) => candidate.id === userId);
  assert.ok(user, `missing seeded user ${userId}`);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    centerIds: user.centerIds,
  };
}

test("demo data contains expected seeded records", () => {
  resetDemoStore();
  const data = createDemoData();
  assert.equal(data.centers.length, 2);
  assert.equal(data.users.length, 6);
  assert.equal(data.children.length, 10);
  assert.equal(data.observations.length, 22);
  assert.equal(data.milestoneDefinitions.length, 4);
});

test("worker is linked to center-1 children", () => {
  const data = createDemoData();
  const worker = data.users.find((u) => u.id === "worker-1");
  assert.ok(worker);
  assert.deepEqual(worker.centerIds, ["center-1"]);
  const workerChildren = data.children.filter((c) => c.centerId === "center-1");
  assert.equal(workerChildren.length, 6);
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

test("a parent cannot retrieve an unlinked child", () => {
  const parent = sessionFor("parent-1");
  assert.deepEqual(getAuthorizedChildren(parent).map((child) => child.id).sort(), ["child-1", "child-4"]);
  assert.throws(() => assertChildAccess(parent, "child-2"), /NOT_FOUND/);
});

test("a worker cannot retrieve a child outside their center scope", () => {
  const worker = sessionFor("worker-1");
  assert.throws(() => assertChildAccess(worker, "child-3"), /NOT_FOUND/);
});

test("recent dashboard observations resolve their child names from state", () => {
  const state = createDemoData();
  const session = sessionFor("worker-1");
  const recent = getRecentObservationChildren(state, session);
  assert.ok(recent.length > 0);
  for (const item of recent) assert.ok(item.child, "recent observations should resolve to a scoped child record");
});

test("child profile routes resolve IDs from demo and Prisma database result shapes", () => {
  assert.equal(resolveProfileChildId({ child: { id: "demo-child" } }), "demo-child");
  assert.equal(resolveProfileChildId({ id: "sqlite-child" }), "sqlite-child");
});

test("demo credentials accept the documented quick-login password and reject an invalid password", async () => {
  const worker = createDemoData().users.find((user) => user.id === "worker-1");
  assert.ok(worker);
  assert.equal(await verifyPassword("balsathi123", worker.passwordHash), true);
  assert.equal(await verifyPassword("incorrect-password", worker.passwordHash), false);
});
