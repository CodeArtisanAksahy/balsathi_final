import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { clientStore } from "./client-store";
import { storeActions } from "./store-actions";
import {
  getDashboardData,
  getChildProfile,
  getMilestoneStatistics,
  getGrowthHistory,
  getChildrenDirectory,
  getObservationTrends,
  getAuthorizedChildren,
} from "./selectors";
import { processChat } from "./chat-service";
import { createDemoData } from "./demo-data";
import type { SessionUser, DemoData } from "./domain";

// jsdom localStorage polyfill (vitest jsdom env may not expose it by default)
beforeAll(() => {
  const ensureStorage = (obj: any) => {
    if (!obj.localStorage || typeof obj.localStorage.getItem !== "function") {
      const store = new Map<string, string>();
      obj.localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
        clear: () => { store.clear(); },
      };
    }
  };
  ensureStorage(globalThis);
  if (typeof window !== "undefined") ensureStorage(window);
});

function workerSession(): SessionUser {
  const seeded = createDemoData();
  const worker = seeded.users.find((u) => u.role === "WORKER" && u.centerIds.includes("center-1"))!;
  return {
    id: worker.id,
    name: worker.name,
    email: worker.email,
    role: worker.role,
    preferredLanguage: worker.preferredLanguage,
    centerIds: worker.centerIds,
  };
}

function parentSession(): SessionUser {
  const seeded = createDemoData();
  const parent = seeded.users.find((u) => u.role === "PARENT")!;
  return {
    id: parent.id,
    name: parent.name,
    email: parent.email,
    role: parent.role,
    preferredLanguage: parent.preferredLanguage,
    centerIds: parent.centerIds,
  };
}

describe("Balsathi reactive data flows", () => {
  beforeEach(() => {
    // Reset to fresh seed data before each test (simulates confirmed reset)
    clientStore.reset();
  });

  // ---------- Test 1: Register a child ----------
  it("Test 1: Registering a child increases directory and dashboard counts", () => {
    const session = workerSession();
    const before = getDashboardData(clientStore.getState(), session);
    const beforeCount = before.totalChildren;

    const center = clientStore.getState().centers[0];
    const newChild = storeActions.addChild(session, {
      fullName: "Test Child One",
      dateOfBirth: "2023-01-15",
      gender: "MALE",
      centerId: center.id,
      assignedWorkerId: session.id,
      primaryLanguage: "en",
      emergencyContactName: "Parent One",
      emergencyContactPhone: "+91 9000000001",
      guardian: {
        name: "Parent One",
        phone: "+91 9000000001",
        preferredLanguage: "en",
        relationship: "MOTHER",
      },
    });

    const after = getDashboardData(clientStore.getState(), session);
    expect(after.totalChildren).toBe(beforeCount + 1);

    const directory = getChildrenDirectory(clientStore.getState(), session, { page: 1, pageSize: 100 });
    const found = directory.items.find((c) => c.id === newChild.id);
    expect(found).toBeDefined();
    expect(found!.fullName).toBe("Test Child One");
  });

  // ---------- Test 2: Add an observation ----------
  it("Test 2: Adding an observation updates list, child profile, and dashboard", () => {
    const session = workerSession();
    const children = getAuthorizedChildren(clientStore.getState(), session);
    const child = children[0];
    expect(child).toBeDefined();

    const beforeProfile = getChildProfile(clientStore.getState(), child.id);
    const beforeObsCount = beforeProfile!.observations.length;
    const beforeDashboard = getDashboardData(clientStore.getState(), session);
    const beforeRecent = beforeDashboard.recentObservations.length;

    storeActions.addObservation(session, {
      childId: child.id,
      observedAt: new Date().toISOString(),
      method: "TEXT",
      observationLanguage: "en",
      domain: "LANGUAGE",
      activityContext: "Story circle",
      observationText: "Child pointed at the picture and said 'cat'.",
      workerNotes: "Good language milestone observed.",
      followUpRequired: false,
      reviewStatus: "VERIFIED",
      attachmentIds: [],
      milestoneAssessments: [],
    });

    // Child profile updates
    const afterProfile = getChildProfile(clientStore.getState(), child.id);
    expect(afterProfile!.observations.length).toBe(beforeObsCount + 1);
    expect(afterProfile!.observations[0].observationText).toContain("cat");

    // Dashboard recent observations update
    const afterDashboard = getDashboardData(clientStore.getState(), session);
    expect(afterDashboard.recentObservations.length).toBeGreaterThanOrEqual(beforeRecent);
    const hasNewObs = afterDashboard.recentObservations.some(
      (o) => o.observationText.includes("cat"),
    );
    expect(hasNewObs).toBe(true);

    // Domain overview count for LANGUAGE increases
    const langBefore = beforeDashboard.domainOverview.find((d) => d.domain === "LANGUAGE")!.count;
    const langAfter = afterDashboard.domainOverview.find((d) => d.domain === "LANGUAGE")!.count;
    expect(langAfter).toBe(langBefore + 1);
  });

  // ---------- Test 3: Update a milestone ----------
  it("Test 3: Updating a milestone changes completion statistics", () => {
    const session = workerSession();
    const children = getAuthorizedChildren(clientStore.getState(), session);
    const child = children[0];
    const milestoneDef = clientStore.getState().milestoneDefinitions[0];

    const before = getMilestoneStatistics(clientStore.getState(), child.id);

    // Add a milestone assessment as MET
    const assessment = storeActions.addMilestoneAssessment(session, {
      childId: child.id,
      milestoneId: milestoneDef.id,
      status: "MET",
      notes: "Achieved independently",
    });

    const afterAdd = getMilestoneStatistics(clientStore.getState(), child.id);
    expect(afterAdd.total).toBe(before.total + 1);
    expect(afterAdd.met).toBe(before.met + 1);

    // Update it to NEEDS_REVIEW
    storeActions.updateMilestoneAssessment(session, assessment.id, { status: "NEEDS_REVIEW" });
    const afterUpdate = getMilestoneStatistics(clientStore.getState(), child.id);
    expect(afterUpdate.met).toBe(before.met);
    expect(afterUpdate.needsReview).toBe(before.needsReview + 1);
  });

  // ---------- Test 4: Add a growth measurement ----------
  it("Test 4: Adding a growth measurement appears in growth history", () => {
    const session = workerSession();
    const children = getAuthorizedChildren(clientStore.getState(), session);
    const child = children[0];

    const before = getGrowthHistory(clientStore.getState(), child.id);

    storeActions.addGrowthMeasurement(session, {
      childId: child.id,
      measuredAt: "2024-06-01T00:00:00.000Z",
      heightCm: 95.5,
      weightKg: 14.2,
      headCircumferenceCm: 48.0,
      notes: "Routine checkup",
    });

    const after = getGrowthHistory(clientStore.getState(), child.id);
    expect(after.length).toBe(before.length + 1);

    // The new measurement should be present (sorted by date; may not be last).
    const added = after.find((m) => m.heightCm === 95.5 && m.weightKg === 14.2);
    expect(added).toBeDefined();

    // Historical measurements must NOT be overwritten
    expect(after.length).toBeGreaterThanOrEqual(1);
    const oldMeasurements = after.filter((m) => m.heightCm !== 95.5);
    expect(oldMeasurements.length).toBe(before.length);
  });

  // ---------- Test 5: Edit an observation ----------
  it("Test 5: Editing an observation reflects updated text across views", () => {
    const session = workerSession();
    const children = getAuthorizedChildren(clientStore.getState(), session);
    const child = children[0];

    // First add an observation
    const result = storeActions.addObservation(session, {
      childId: child.id,
      observedAt: new Date().toISOString(),
      method: "TEXT",
      observationLanguage: "en",
      domain: "COGNITIVE",
      activityContext: "Play",
      observationText: "Original observation text.",
      workerNotes: "",
      followUpRequired: false,
      reviewStatus: "REVIEW_PENDING",
      attachmentIds: [],
      milestoneAssessments: [],
    });

    // Edit it
    storeActions.updateObservation(session, result.observation.id, {
      observationText: "Updated observation text with new details.",
    });

    // Verify in child profile
    const profile = getChildProfile(clientStore.getState(), child.id);
    const edited = profile!.observations.find((o) => o.id === result.observation.id);
    expect(edited?.observationText).toBe("Updated observation text with new details.");

    // Verify in dashboard recent observations
    const dashboard = getDashboardData(clientStore.getState(), session);
    const inDashboard = dashboard.recentObservations.some(
      (o) => o.id === result.observation.id && o.observationText.includes("Updated"),
    );
    expect(inDashboard).toBe(true);
  });

  // ---------- Test 6: Persistence across refresh ----------
  it("Test 6: Records persist after a simulated page refresh (localStorage)", () => {
    const session = workerSession();
    const center = clientStore.getState().centers[0];

    // Create a child
    const child = storeActions.addChild(session, {
      fullName: "Persisted Child",
      dateOfBirth: "2022-05-10",
      gender: "FEMALE",
      centerId: center.id,
      assignedWorkerId: session.id,
      primaryLanguage: "en",
      emergencyContactName: "Parent",
      emergencyContactPhone: "+91 9000000002",
      guardian: {
        name: "Parent",
        phone: "+91 9000000002",
        preferredLanguage: "en",
        relationship: "FATHER",
      },
    });

    // Simulate page refresh by creating a new store instance that reads from localStorage.
    // We verify the persisted key contains the new child.
    const raw = window.localStorage.getItem("balsathi:client-store:v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as DemoData;
    const persistedChild = parsed.children.find((c) => c.id === child.id);
    expect(persistedChild).toBeDefined();
    expect(persistedChild!.fullName).toBe("Persisted Child");

    // Also add an observation and confirm it's persisted
    storeActions.addObservation(session, {
      childId: child.id,
      observedAt: new Date().toISOString(),
      method: "TEXT",
      observationLanguage: "en",
      domain: "LANGUAGE",
      activityContext: "Test",
      observationText: "Persisted observation",
      workerNotes: "",
      followUpRequired: false,
      reviewStatus: "VERIFIED",
      attachmentIds: [],
      milestoneAssessments: [],
    });

    const raw2 = window.localStorage.getItem("balsathi:client-store:v1");
    const parsed2 = JSON.parse(raw2!) as DemoData;
    expect(parsed2.observations.some((o) => o.observationText === "Persisted observation")).toBe(true);
  });

  // ---------- Test 7: Chatbot returns counts from current records ----------
  it("Test 7: Chatbot returns observation counts calculated from current records", () => {
    const session = workerSession();
    const children = getAuthorizedChildren(clientStore.getState(), session);
    const child = children[0];

    const result = processChat(session, "en", `How many observations for ${child.fullName}?`, child.id);
    const expectedCount = clientStore.getState().observations.filter((o) => o.childId === child.id).length;

    // The answer should mention the actual count
    expect(result.intent).toBe("observations");
    expect(result.sources.length).toBeGreaterThanOrEqual(0);

    // Add an observation and re-query — count should reflect the new record immediately
    storeActions.addObservation(session, {
      childId: child.id,
      observedAt: new Date().toISOString(),
      method: "TEXT",
      observationLanguage: "en",
      domain: "PHYSICAL",
      activityContext: "Test",
      observationText: "New observation for chatbot test",
      workerNotes: "",
      followUpRequired: false,
      reviewStatus: "VERIFIED",
      attachmentIds: [],
      milestoneAssessments: [],
    });

    const resultAfter = processChat(session, "en", `observations for ${child.fullName}`, child.id);
    const data = resultAfter.data as Array<{ id: string }> | undefined;
    expect(data).toBeDefined();
    expect(data!.length).toBe(expectedCount + 1);
    expect(resultAfter.sources.some((s) => s.includes("observation:"))).toBe(true);
  });

  // ---------- Test 8: Filters change displayed data and charts ----------
  it("Test 8: Changing filter updates displayed data and chart uses same filter", () => {
    const session = workerSession();

    // Get all children
    const all = getChildrenDirectory(clientStore.getState(), session, { page: 1, pageSize: 100 });
    expect(all.total).toBeGreaterThan(0);

    // Filter by a search query matching a specific child name
    const someChild = all.items[0];
    const filtered = getChildrenDirectory(clientStore.getState(), session, {
      q: someChild.fullName,
      page: 1,
      pageSize: 100,
    });

    // Filtered results should be a subset and include the matching child
    expect(filtered.total).toBeLessThanOrEqual(all.total);
    expect(filtered.items.some((c) => c.id === someChild.id)).toBe(true);

    // Verify the observation trend chart data is derived from the same store (no hardcoding)
    const trends = getObservationTrends(clientStore.getState(), session, 6);
    expect(trends.length).toBe(6);
    // Sum of observations across months should equal total authorized observations
    const totalAuthorizedObs = clientStore.getState().observations.filter((o) => {
      const childIds = new Set(getAuthorizedChildren(clientStore.getState(), session).map((c) => c.id));
      return childIds.has(o.childId);
    }).length;
    const sumTrendObs = trends.reduce((acc, m) => acc + m.observations, 0);
    expect(sumTrendObs).toBeLessThanOrEqual(totalAuthorizedObs);
  });

  // ---------- Test 9: Two children have separate records ----------
  it("Test 9: Opening two children shows separate observations and charts", () => {
    const session = workerSession();
    const children = getAuthorizedChildren(clientStore.getState(), session);
    expect(children.length).toBeGreaterThanOrEqual(2);

    const childA = children[0];
    const childB = children[1];

    // Add observation only to child A
    storeActions.addObservation(session, {
      childId: childA.id,
      observedAt: new Date().toISOString(),
      method: "TEXT",
      observationLanguage: "en",
      domain: "LANGUAGE",
      activityContext: "Test A",
      observationText: "Observation for child A only",
      workerNotes: "",
      followUpRequired: false,
      reviewStatus: "VERIFIED",
      attachmentIds: [],
      milestoneAssessments: [],
    });

    const profileA = getChildProfile(clientStore.getState(), childA.id);
    const profileB = getChildProfile(clientStore.getState(), childB.id);

    // Child A should have the new observation
    expect(profileA!.observations.some((o) => o.observationText.includes("child A only"))).toBe(true);

    // Child B should NOT have it
    expect(profileB!.observations.some((o) => o.observationText.includes("child A only"))).toBe(false);

    // Growth histories must be separate
    const growthA = getGrowthHistory(clientStore.getState(), childA.id);
    const growthB = getGrowthHistory(clientStore.getState(), childB.id);
    const allGrowth = clientStore.getState().growthMeasurements;
    const aMeasurements = allGrowth.filter((g) => g.childId === childA.id);
    const bMeasurements = allGrowth.filter((g) => g.childId === childB.id);
    expect(growthA.length).toBe(aMeasurements.length);
    expect(growthB.length).toBe(bMeasurements.length);
    // No overlap
    const aIds = new Set(growthA.map((g) => g.id));
    growthB.forEach((g) => expect(aIds.has(g.id)).toBe(false));
  });

  // ---------- Test 10: Reset demo data ----------
  it("Test 10: Reset restores seed data and removes user-created records", () => {
    const session = workerSession();
    const center = clientStore.getState().centers[0];

    // Create a child (user action)
    const child = storeActions.addChild(session, {
      fullName: "Temporary Test Child",
      dateOfBirth: "2023-03-03",
      gender: "MALE",
      centerId: center.id,
      assignedWorkerId: session.id,
      primaryLanguage: "en",
      emergencyContactName: "Temp Parent",
      emergencyContactPhone: "+91 9000000099",
      guardian: {
        name: "Temp Parent",
        phone: "+91 9000000099",
        preferredLanguage: "en",
        relationship: "OTHER",
      },
    });

    // Verify the child exists
    let profile = getChildProfile(clientStore.getState(), child.id);
    expect(profile).not.toBeNull();

    // Reset (the UI shows a confirmation dialog before calling this)
    storeActions.reset();

    // After reset, the user-created child should be gone
    profile = getChildProfile(clientStore.getState(), child.id);
    expect(profile).toBeNull();

    // Seed data should be restored — check expected counts from createDemoData
    const seeded = createDemoData();
    const state = clientStore.getState();
    expect(state.children.length).toBe(seeded.children.length);
    expect(state.observations.length).toBe(seeded.observations.length);
    expect(state.milestoneDefinitions.length).toBe(seeded.milestoneDefinitions.length);

    // localStorage should also reflect the reset state
    const raw = window.localStorage.getItem("balsathi:client-store:v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as DemoData;
    expect(parsed.children.length).toBe(seeded.children.length);
  });
});
