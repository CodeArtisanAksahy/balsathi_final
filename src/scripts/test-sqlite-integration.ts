import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { config } from "@/lib/config";
import { forecastDashboardSchema } from "@/lib/forecast-contract";
import { prisma } from "@/lib/prisma";
import { enforceConfiguredRateLimit } from "@/lib/request-security";
import { getDatabaseChildRegistrationOptions } from "@/lib/database-service";

function requireTestDatabase() {
  if (config.dataMode !== "sqlite") throw new Error("Run with DATA_MODE=sqlite.");
  if (process.env.ALLOW_SQLITE_INTEGRATION_FIXTURES !== "true") throw new Error("Set ALLOW_SQLITE_INTEGRATION_FIXTURES=true to authorize temporary isolated test fixtures.");
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to run temporary integration fixtures in production.");
  const databaseName = config.databaseUrl ? new URL(config.databaseUrl).pathname.replace(/^\//, "") : "";
  if (!/(^|[-_])test($|[-_])|^test\.db$/i.test(databaseName)) throw new Error("DATABASE_URL must target a dedicated SQLite test.db file.");
}

async function main() {
  requireTestDatabase();
  if (process.env.TEST_API_BASE_URL && process.env.TEST_FORECAST_ADMIN_USER_ID) {
    await runReadOnlyIntegration(process.env.TEST_API_BASE_URL, process.env.TEST_FORECAST_ADMIN_USER_ID);
    return;
  }
  const [centerCount, userCount, childCount, observationCount] = await Promise.all([
    prisma.center.count(), prisma.user.count(), prisma.child.count(), prisma.observation.count(),
  ]);
  assert.equal(centerCount + userCount + childCount + observationCount, 0, "Refusing to add fixtures to a non-empty database.");

  const suffix = randomUUID();
  const rateLimitKey = `it-rate-${suffix}`;
  let provisionedCenterId: string | null = null;
  let registeredChildId: string | null = null;
  const centerId = `it-center-${suffix}`;
  const otherCenterId = `it-other-center-${suffix}`;
  const workerId = `it-worker-${suffix}`;
  const adminId = `it-admin-${suffix}`;
  const parentId = `it-parent-${suffix}`;
  const otherAdminId = `it-other-admin-${suffix}`;
  const districtAdminId = `it-district-admin-${suffix}`;
  const childId = `it-child-${suffix}`;
  const otherChildId = `it-other-child-${suffix}`;
  const guardianId = `it-guardian-${suffix}`;
  const provisioningGuardianId = `it-provisioning-guardian-${suffix}`;
  const milestoneId = `it-milestone-${suffix}`;
  const email = `it-${suffix}@example.invalid`;
  const passwordHash = await bcrypt.hash("Temporary-Integration-Password-1", 4);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.center.createMany({ data: [
        { id: centerId, code: `IT-${suffix}`, name: "Integration Test Center", village: "Test", district: "Test", state: "Test" },
        { id: otherCenterId, code: `ITO-${suffix}`, name: "Integration Other Center", village: "Test", district: "Test", state: "Test" },
      ] });
      await tx.user.createMany({ data: [
        { id: workerId, name: "Integration Worker", email: `worker-${email}`, role: "WORKER", phone: "0000000000", centerIds: [centerId], passwordHash },
        { id: adminId, name: "Integration Admin", email: `admin-${email}`, role: "CENTER_ADMIN", phone: "0000000001", centerIds: [centerId], passwordHash },
        { id: parentId, name: "Integration Parent", email: `parent-${email}`, role: "PARENT", phone: "0000000002", centerIds: [], passwordHash },
        { id: otherAdminId, name: "Other Integration Admin", email: `other-${email}`, role: "CENTER_ADMIN", phone: "0000000003", centerIds: [otherCenterId], passwordHash },
        { id: districtAdminId, name: "Integration District Admin", email: `district-${email}`, role: "DISTRICT_ADMIN", phone: "0000000007", centerIds: [], passwordHash },
      ] });
      await tx.guardian.create({ data: { id: guardianId, name: "Test Guardian", phone: "0000000004", address: "Test", linkedUserId: parentId } });
      await tx.guardian.create({ data: { id: provisioningGuardianId, name: "Second Test Guardian", phone: "0000000008", address: "Test", linkedUserId: null } });
      await tx.child.createMany({ data: [
        { id: childId, internalId: `IT-${suffix}`, fullName: "Integration Child", dateOfBirth: new Date("2022-01-01T00:00:00Z"), centerId, assignedWorkerId: workerId, emergencyContactName: "Test", emergencyContactPhone: "0000000005", siblingIds: [] },
        { id: otherChildId, internalId: `ITO-${suffix}`, fullName: "Other Integration Child", dateOfBirth: new Date("2022-01-01T00:00:00Z"), centerId: otherCenterId, assignedWorkerId: otherAdminId, emergencyContactName: "Test", emergencyContactPhone: "0000000006", siblingIds: [] },
      ] });
      await tx.childGuardian.create({ data: { childId, guardianId, relationship: "MOTHER", isPrimary: true } });
      await tx.childGuardian.create({ data: { childId, guardianId: provisioningGuardianId, relationship: "FATHER", isPrimary: false } });
      await tx.milestoneDefinition.create({ data: {
        id: milestoneId, slug: `it-${suffix}`, domain: "LANGUAGE", titleEn: "Test", titleHi: "Test", titleMr: "Test",
        descriptionEn: "Test", descriptionHi: "Test", descriptionMr: "Test", minAgeMonths: 0, maxAgeMonths: 120, reviewAfterMonths: 12,
        activitiesEn: [], activitiesHi: [], activitiesMr: [],
      } });
    });

    const registrationOptions = await getDatabaseChildRegistrationOptions({ id: adminId, name: "Integration Admin", email: `admin-${email}`, role: "CENTER_ADMIN", preferredLanguage: "en", centerIds: [centerId] });
    assert.deepEqual(registrationOptions.centers.map((center) => center.id), [centerId]);
    assert.deepEqual(registrationOptions.workers.map((worker) => worker.id), [workerId]);
    await assert.rejects(() => getDatabaseChildRegistrationOptions({ id: parentId, name: "Integration Parent", email: `parent-${email}`, role: "PARENT", preferredLanguage: "en", centerIds: [] }), /Parents cannot register children/);

    const baseUrl = process.env.TEST_API_BASE_URL;
    assert.ok(baseUrl, "Set TEST_API_BASE_URL to the running local app.");
    const sign = async (id: string, role: string, centers: string[]) => {
      const tokenId = randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60_000);
      await prisma.authSession.create({ data: { id: tokenId, userId: id, expiresAt } });
      return new SignJWT({ role, centerIds: centers, name: "Integration", email })
        .setProtectedHeader({ alg: "HS256" }).setSubject(id).setJti(tokenId).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(config.authSecret));
    };
    const client = async (id: string, role: string, centers: string[]) => {
      const token = await sign(id, role, centers);
      return async (path: string, init: RequestInit = {}) => fetch(`${baseUrl!.replace(/\/$/, "")}${path}`, {
        ...init,
      headers: { cookie: `${config.sessionCookie}=${token}`, origin: baseUrl!, ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
      });
    };

    const loginEmail = `worker-${email}`;
    await prisma.user.update({ where: { id: workerId }, data: { email: loginEmail } });
    const loginResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/login`, { method: "POST", headers: { origin: baseUrl, "content-type": "application/json" }, body: JSON.stringify({ email: loginEmail, password: "Temporary-Integration-Password-1" }) });
    assert.equal(loginResponse.status, 200, `SQLite login failed: ${loginResponse.status}`);
    const loginCookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
    assert.ok(loginCookie, "SQLite login did not issue a session cookie.");
    const activeSession = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, { headers: { cookie: loginCookie } });
    assert.equal(activeSession.status, 200);
    const expiredAt = Math.floor(Date.now() / 1000) - 1;
    const expiredToken = await new SignJWT({ role: "WORKER", centerIds: [centerId] }).setProtectedHeader({ alg: "HS256" }).setSubject(workerId).setIssuedAt(expiredAt - 60).setExpirationTime(expiredAt).sign(new TextEncoder().encode(config.authSecret));
    const expiredSession = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, { headers: { cookie: `${config.sessionCookie}=${expiredToken}` } });
    assert.equal((await expiredSession.json()).data, null, "Expired session was accepted.");
    const changedRole = await prisma.user.update({ where: { id: workerId }, data: { role: "PARENT" } });
    try {
      const roleAfterUpdate = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/children`, { headers: { cookie: loginCookie } });
      assert.equal(roleAfterUpdate.status, 200);
      assert.deepEqual((await roleAfterUpdate.json()).data.items, [], "Database role change did not remove worker center scope for the existing session.");
    } finally {
      await prisma.user.update({ where: { id: changedRole.id }, data: { role: "WORKER" } });
    }
    await prisma.user.update({ where: { id: adminId }, data: { centerIds: [] } });
    const adminToken = await sign(adminId, "CENTER_ADMIN", [centerId]);
    const changedScope = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/children`, { headers: { cookie: `${config.sessionCookie}=${adminToken}` } });
    assert.deepEqual((await changedScope.json()).data.items, [], "Database center-scope change did not apply to the existing session.");
    await prisma.user.update({ where: { id: adminId }, data: { centerIds: [centerId] } });
    const disabledLogin = await prisma.user.update({ where: { id: workerId }, data: { active: false } });
    try {
      const disabledSession = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, { headers: { cookie: loginCookie } });
      assert.equal((await disabledSession.json()).data, null, "Disabled account session was not rejected.");
    } finally {
      await prisma.user.update({ where: { id: disabledLogin.id }, data: { active: true } });
    }
    const logout = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/logout`, { method: "POST", headers: { origin: baseUrl, cookie: loginCookie } });
    assert.equal(logout.status, 200, "Logout failed.");
    assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/i, "Logout did not expire the session cookie.");
    const revokedLoginSession = await prisma.authSession.findFirst({ where: { userId: workerId, revokedAt: { not: null } } });
    assert.ok(revokedLoginSession, "Logout did not durably revoke the session.");
    const revokedCookieSession = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, { headers: { cookie: loginCookie } });
    assert.equal((await revokedCookieSession.json()).data, null, "Revoked session remained authenticated.");
    const unauthorized = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/children`);
    assert.equal(unauthorized.status, 401, "Unauthenticated request was not rejected.");

    const adminRequest = await client(adminId, "CENTER_ADMIN", [centerId]);
    const workerRequest = await client(workerId, "WORKER", [centerId]);
    const parentRequest = await client(parentId, "PARENT", []);
    const otherAdminRequest = await client(otherAdminId, "CENTER_ADMIN", [otherCenterId]);
    const districtRequest = await client(districtAdminId, "DISTRICT_ADMIN", []);

    const limitedRequest = new Request("http://localhost/api/test", { headers: { "x-forwarded-for": "198.51.100.72" } });
    await enforceConfiguredRateLimit(limitedRequest, rateLimitKey, 2, 60_000);
    await enforceConfiguredRateLimit(limitedRequest, rateLimitKey, 2, 60_000);
    await assert.rejects(() => enforceConfiguredRateLimit(limitedRequest, rateLimitKey, 2, 60_000), (error: { status?: number }) => error.status === 429);

    const registrationKey = `it-child-${suffix}`;
    const childInput = { fullName: "Registered Integration Child", dateOfBirth: "2021-06-15", gender: "FEMALE", centerId, assignedWorkerId: workerId, primaryLanguage: "en", emergencyContactName: "Test Contact", emergencyContactPhone: "0000000015", guardian: { name: "Registration Guardian", phone: "0000000016", preferredLanguage: "en", relationship: "MOTHER" } };
    const registered = await adminRequest("/api/children", { method: "POST", headers: { "idempotency-key": registrationKey }, body: JSON.stringify(childInput) });
    assert.equal(registered.status, 201, `Child registration failed: ${registered.status}`);
    const registeredBody = (await registered.json()).data;
    registeredChildId = registeredBody.id;
    const repeatedRegistration = await adminRequest("/api/children", { method: "POST", headers: { "idempotency-key": registrationKey }, body: JSON.stringify(childInput) });
    assert.equal(repeatedRegistration.status, 201);
    assert.equal((await repeatedRegistration.json()).data.id, registeredChildId, "Child registration retry created another record.");
    const childVersion = new Date(registeredBody.updatedAt).toISOString();
    const childUpdated = await adminRequest(`/api/v1/children/${registeredChildId}`, { method: "PATCH", headers: { "if-match": childVersion }, body: JSON.stringify({ fullName: "Updated Integration Child" }) });
    assert.equal(childUpdated.status, 200, "Scoped child profile update failed.");
    assert.equal((await adminRequest(`/api/v1/children/${registeredChildId}`, { method: "PATCH", headers: { "if-match": childVersion }, body: JSON.stringify({ fullName: "Stale Update" }) })).status, 412, "Stale child update was accepted.");

    const createdCenterResponse = await districtRequest("/api/v1/admin/centers", { method: "POST", body: JSON.stringify({ code: `P-${suffix.slice(0, 8)}`, name: "Provisioned Center", village: "Village", district: "District", state: "State" }) });
    assert.equal(createdCenterResponse.status, 201, `District admin could not create center: ${createdCenterResponse.status}`);
    const createdCenter = (await createdCenterResponse.json()).data;
    provisionedCenterId = createdCenter.id;
    assert.equal((await districtRequest("/api/v1/admin/centers", { method: "POST", body: JSON.stringify({ code: createdCenter.code, name: "Duplicate Code Center", village: "Village", district: "District", state: "State" }) })).status, 409, "Duplicate center code was accepted.");
    assert.equal((await districtRequest(`/api/v1/admin/centers/${centerId}`, { method: "PATCH", body: JSON.stringify({ active: false }) })).status, 409, "Center with active children was deactivated.");
    assert.equal((await adminRequest("/api/v1/admin/centers", { method: "POST", body: JSON.stringify({ code: `X-${suffix.slice(0, 8)}`, name: "Unauthorized Center", village: "Village", district: "District", state: "State" }) })).status, 403, "Center admin created a center.");
    const centerAdminResponse = await districtRequest("/api/v1/admin/users", { method: "POST", body: JSON.stringify({ name: "Provisioned Admin", email: `provisioned-admin-${email}`, phone: "0000000011", password: "Valid-Integration-Password-2", role: "CENTER_ADMIN", centerIds: [createdCenter.id], preferredLanguage: "en" }) });
    assert.equal(centerAdminResponse.status, 201, `District admin could not provision center admin: ${centerAdminResponse.status}`);
    const createdAdmin = (await centerAdminResponse.json()).data;
    const createdAdminRequest = await client(createdAdmin.id, "CENTER_ADMIN", [createdCenter.id]);
    const staffResponse = await createdAdminRequest("/api/v1/admin/users", { method: "POST", body: JSON.stringify({ name: "Provisioned Worker", email: `provisioned-worker-${email}`, phone: "0000000012", password: "Valid-Integration-Password-3", role: "WORKER", centerIds: [createdCenter.id], preferredLanguage: "en" }) });
    assert.equal(staffResponse.status, 201, `Center admin could not provision worker: ${staffResponse.status}`);
    const createdWorker = (await staffResponse.json()).data;
    assert.equal((await createdAdminRequest("/api/v1/admin/users", { method: "POST", body: JSON.stringify({ name: "Out of Scope", email: `out-of-scope-${email}`, phone: "0000000013", password: "Valid-Integration-Password-4", role: "WORKER", centerIds: [otherCenterId] }) })).status, 403, "Center admin assigned staff outside its center.");
    assert.equal((await createdAdminRequest("/api/v1/admin/users", { method: "POST", body: JSON.stringify({ name: "Escalated Admin", email: `escalated-${email}`, phone: "0000000014", password: "Valid-Integration-Password-5", role: "CENTER_ADMIN", centerIds: [createdCenter.id] }) })).status, 403, "Center admin promoted a user to administrator.");
    const createdParentResponse = await adminRequest("/api/v1/admin/users", { method: "POST", body: JSON.stringify({ name: "Second Test Guardian", email: `provisioned-parent-${email}`, phone: "0000000008", password: "Valid-Integration-Password-6", role: "PARENT", centerIds: [], guardianLinks: [{ childId, relationship: "FATHER" }] }) });
    assert.equal(createdParentResponse.status, 201, `Center admin could not provision linked parent: ${createdParentResponse.status} ${JSON.stringify(await createdParentResponse.clone().json())}`);
    const createdParent = (await createdParentResponse.json()).data;
    const createdParentRequest = await client(createdParent.id, "PARENT", []);
    assert.equal((await createdParentRequest(`/api/v1/children/${childId}`)).status, 200, "New parent did not receive its validated child link.");
    assert.equal((await createdParentRequest(`/api/v1/children/${otherChildId}`)).status, 404, "New parent accessed an unrelated child.");
    assert.equal((await adminRequest("/api/v1/admin/users", { method: "POST", body: JSON.stringify({ name: "Second Test Guardian", email: `provisioned-parent-${email}`, phone: "0000000008", password: "Valid-Integration-Password-6", role: "PARENT", centerIds: [], guardianLinks: [{ childId, relationship: "FATHER" }] }) })).status, 409, "Duplicate account email was accepted.");
    const workerToken = await sign(createdWorker.id, "WORKER", [createdCenter.id]);
    assert.equal((await districtRequest(`/api/v1/admin/users/${createdWorker.id}`, { method: "PATCH", body: JSON.stringify({ active: false }) })).status, 200, "District admin could not deactivate a provisioned worker.");
    const revokedWorkerSession = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, { headers: { cookie: `${config.sessionCookie}=${workerToken}` } });
    assert.equal((await revokedWorkerSession.json()).data, null, "Deactivation did not revoke the worker's active session.");
    const createdAdminToken = await sign(createdAdmin.id, "CENTER_ADMIN", [createdCenter.id]);
    assert.equal((await districtRequest(`/api/v1/admin/centers/${createdCenter.id}`, { method: "PATCH", body: JSON.stringify({ active: false }) })).status, 200, "District admin could not deactivate an empty center.");
    const deactivatedAdmin = await prisma.user.findUnique({ where: { id: createdAdmin.id } });
    assert.equal(deactivatedAdmin?.active, false, "Center deactivation did not deactivate its sole center administrator.");
    assert.deepEqual(deactivatedAdmin?.centerIds, []);
    const revokedAdminSession = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/session`, { headers: { cookie: `${config.sessionCookie}=${createdAdminToken}` } });
    assert.equal((await revokedAdminSession.json()).data, null, "Center deactivation did not revoke its administrator session.");

    const scoped = await adminRequest("/api/v1/children");
    assert.equal(scoped.status, 200);
    assert.deepEqual(new Set((await scoped.json()).data.items.map((item: { id: string }) => item.id)), new Set([childId, registeredChildId]));
    assert.equal((await adminRequest(`/api/v1/children/${otherChildId}`)).status, 404, "Center admin crossed center boundary.");
    assert.equal((await parentRequest(`/api/v1/children/${otherChildId}`)).status, 404, "Parent accessed an unlinked child.");
    assert.equal((await workerRequest(`/api/v1/children/${otherChildId}`)).status, 404, "Worker crossed center boundary.");
    assert.equal((await otherAdminRequest(`/api/v1/children/${childId}`)).status, 404, "Other center admin crossed center boundary.");

    const createPath = `/api/v1/children/${childId}/observations`;
    const idempotencyKey = `it-${suffix}`;
    const observationBody = { observedAt: new Date(Date.now() - 60_000).toISOString(), method: "TEXT", observationLanguage: "en", domain: "LANGUAGE", activityContext: "Integration test", observationText: "Temporary integration observation.", workerNotes: "", followUpRequired: true, reviewStatus: "REVIEW_PENDING", attachmentIds: [], milestoneAssessments: [{ milestoneId, status: "MET", notes: "Test" }] };
    const crossOriginMutation = await workerRequest(createPath, { method: "POST", headers: { origin: "https://attacker.invalid" }, body: JSON.stringify(observationBody) });
    assert.equal(crossOriginMutation.status, 403, "Cross-origin mutation was not rejected.");
    const created = await workerRequest(createPath, { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify(observationBody) });
    assert.equal(created.status, 201, `Observation create failed: ${created.status} ${JSON.stringify(await created.clone().json())}`);
    const createdBody = await created.json();
    const retry = await workerRequest(createPath, { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify(observationBody) });
    assert.equal(retry.status, 201);
    assert.equal((await retry.json()).data.id, createdBody.data.id, "Idempotent retry did not return the original record.");
    assert.equal(await prisma.observation.count({ where: { childId } }), 1, "Duplicate retry created a second observation.");
    const readBack = await workerRequest(`/api/v1/children/${childId}`);
    assert.equal(readBack.status, 200, "Persisted child profile could not be read back.");
    assert.equal((await readBack.json()).data.observations[0].id, createdBody.data.id);
    const bootstrap = await adminRequest("/api/bootstrap");
    const snapshot = (await bootstrap.json()).data.state;
    assert.ok(snapshot.riskAssessments.some((risk: { childId: string; reviewRequired: boolean }) => risk.childId === childId && risk.reviewRequired), "Persisted follow-up was missing from the authorized dashboard bootstrap.");
    const dashboard = await adminRequest("/api/dashboard");
    const dashboardData = (await dashboard.json()).data;
    assert.equal(dashboardData.totalChildren, 2);
    assert.equal(dashboardData.followUpChildren, 1);
    assert.equal(dashboardData.observationsThisWeek, 1);
    assert.equal(dashboardData.pendingReview, 1);
    const stale = await workerRequest(`/api/v1/children/${childId}/observations`, { method: "PATCH", headers: { "if-match": "2000-01-01T00:00:00.000Z" }, body: JSON.stringify({ observationId: createdBody.data.id, observationText: "Updated integration observation" }) });
    assert.equal(stale.status, 412, "Stale observation update did not report a version conflict.");
    const invalid = await workerRequest(`/api/v1/children/${childId}/observations`, { method: "POST", body: JSON.stringify({ ...observationBody, observedAt: "not-a-date" }) });
    assert.equal(invalid.status, 400, "Invalid observation input was accepted.");

    const growth = await workerRequest(`/api/v1/children/${childId}/growth-measurements`, { method: "POST", body: JSON.stringify({ measuredAt: new Date(Date.now() - 30_000).toISOString(), heightCm: 100, weightKg: 15, measurementSource: "WORKER_ENTRY" }) });
    assert.equal(growth.status, 201, `Growth record failed: ${growth.status}`);
    const preBirthGrowth = await workerRequest(`/api/v1/children/${childId}/growth-measurements`, { method: "POST", body: JSON.stringify({ measuredAt: "2021-12-31T00:00:00.000Z", heightCm: 100, weightKg: 15 }) });
    assert.equal(preBirthGrowth.status, 422, "Pre-birth growth record was accepted.");
    const futureGrowth = await workerRequest(`/api/v1/children/${childId}/growth-measurements`, { method: "POST", body: JSON.stringify({ measuredAt: new Date(Date.now() + 86_400_000).toISOString(), heightCm: 100, weightKg: 15 }) });
    assert.equal(futureGrowth.status, 422, "Future growth record was accepted.");
    const assessment = await workerRequest(`/api/v1/children/${childId}/milestone-assessments`, { method: "POST", body: JSON.stringify({ milestoneId, status: "IN_PROGRESS", notes: "Integration test", assessedAt: new Date(Date.now() - 30_000).toISOString() }) });
    assert.equal(assessment.status, 201, `Milestone assessment failed: ${assessment.status}`);
    const preBirthAssessment = await workerRequest(`/api/v1/children/${childId}/milestone-assessments`, { method: "POST", body: JSON.stringify({ milestoneId, status: "IN_PROGRESS", assessedAt: "2021-12-31T00:00:00.000Z" }) });
    assert.equal(preBirthAssessment.status, 422, "Pre-birth milestone assessment was accepted.");
    const followUps = await workerRequest("/api/follow-ups");
    assert.equal(followUps.status, 200);
    const followUp = (await followUps.json()).data.find((row: { childId: string }) => row.childId === childId);
    assert.ok(followUp, "Observation follow-up was not persisted.");
    const followUpUpdate = await workerRequest("/api/follow-ups", { method: "PATCH", body: JSON.stringify({ id: followUp.id, status: "IN_PROGRESS", resolutionNotes: "Integration review" }) });
    assert.equal(followUpUpdate.status, 200, "Follow-up update failed.");
    const report = await workerRequest("/api/reports", { method: "POST", body: JSON.stringify({ childId }) });
    assert.equal(report.status, 201, "Report generation failed.");
    const reportRows = await workerRequest(`/api/reports?childId=${childId}`);
    assert.equal(reportRows.status, 200);
    assert.ok((await reportRows.json()).data.length > 0, "Generated report was not persisted.");

    const ready = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health/ready`);
    assert.equal(ready.status, 200, "Readiness endpoint did not report available SQLite.");
    const readinessBody = await ready.json();
    assert.ok(["not_configured", "artifact_missing", "evaluation_invalid", "verified"].includes(readinessBody.dependencies.forecastModel), "Forecast model readiness did not report a provenance state.");
    assert.equal((await workerRequest("/api/v1/analytics/forecast")).status, 403, "Worker could access the administrator forecast endpoint.");
    const forecast = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/analytics/forecast`, { method: "POST", headers: { origin: baseUrl, cookie: `${config.sessionCookie}=${await sign(adminId, "CENTER_ADMIN", [centerId])}` } });
    assert.equal(forecast.status, 503, "Forecast should fail without a real evaluated artifact.");
    const forecastError = await forecast.json();
    assert.ok(["MODEL_NOT_CONFIGURED", "MODEL_ARTIFACT_MISSING", "MODEL_EVALUATION_INVALID", "INSUFFICIENT_HISTORY"].includes(forecastError.error?.code), `Unexpected forecast failure: ${forecastError.error?.code}`);

    console.log(JSON.stringify({ status: "PASS", database: new URL(config.databaseUrl).pathname.slice(1), migrations: "current", sqlite_login: "verified", persistent_rate_limit: "verified", expired_session: "rejected", durable_logout_revocation: "verified", deactivation_revocation: "verified", role_and_center_scope_refresh: "verified", disabled_account: "rejected", same_origin: "verified", center_isolation: "verified", parent_link_scope: "verified", center_and_account_provisioning: "verified", child_registration_options_scope: "verified", duplicate_account_rejected: "verified", child_registration_and_profile: "verified", observation_create_and_readback: "verified", growth_and_milestone_persistence: "verified", follow_up_tracking: "verified", report_generation_and_readback: "verified", idempotent_retry: "verified", stale_update_conflict: "verified", invalid_input: "rejected", readiness: "ready", forecast_rejection: forecastError.error.code, temporary_records_cleaned: "after assertions" }));
  } finally {
    await prisma.$transaction(async (tx) => {
      const createdUserIds = (await tx.user.findMany({ where: { email: { contains: suffix } }, select: { id: true } })).map((user) => user.id);
      await tx.auditLog.deleteMany({ where: { OR: [
        { entityId: { contains: suffix } }, { actorId: { in: createdUserIds } },
        { scopeCenterId: { in: [centerId, otherCenterId, ...(provisionedCenterId ? [provisionedCenterId] : [])] } },
      ] } });
      await tx.rateLimitBucket.deleteMany({ where: { bucketKey: { startsWith: `${rateLimitKey}:` } } });
      await tx.mLPrediction.deleteMany({ where: { modelName: "integration_test" } });
      await tx.reportRecord.deleteMany({ where: { OR: [
        { childId: { in: [childId, otherChildId, ...(registeredChildId ? [registeredChildId] : [])] } },
        { centerId: { in: [centerId, otherCenterId, ...(provisionedCenterId ? [provisionedCenterId] : [])] } },
      ] } });
      await tx.observation.deleteMany({ where: { childId: { in: [childId, otherChildId] } } });
      await tx.milestoneAssessment.deleteMany({ where: { childId: { in: [childId, otherChildId] } } });
      await tx.childGuardian.deleteMany({ where: { childId: { in: [childId, otherChildId] } } });
      await tx.child.deleteMany({ where: { id: { in: [childId, otherChildId] } } });
      if (registeredChildId) await tx.child.deleteMany({ where: { id: registeredChildId } });
      await tx.guardian.deleteMany({ where: { phone: { in: ["0000000015", "0000000016"] } } });
      await tx.guardian.deleteMany({ where: { id: guardianId } });
      await tx.guardian.deleteMany({ where: { id: provisioningGuardianId } });
      await tx.milestoneDefinition.deleteMany({ where: { id: milestoneId } });
      await tx.user.deleteMany({ where: { id: { in: createdUserIds } } });
      if (provisionedCenterId) await tx.center.deleteMany({ where: { id: provisionedCenterId } });
      await tx.center.deleteMany({ where: { id: { in: [centerId, otherCenterId] } } });
    });
    const [centers, users, children, observations, reports] = await Promise.all([
      prisma.center.count({ where: { id: { in: [centerId, otherCenterId] } } }),
      prisma.user.count({ where: { id: { in: [workerId, adminId, parentId, otherAdminId] } } }),
      prisma.child.count({ where: { id: { in: [childId, otherChildId] } } }),
      prisma.observation.count({ where: { childId: { in: [childId, otherChildId] } } }),
      prisma.reportRecord.count({ where: { centerId: { in: [centerId, otherCenterId, ...(provisionedCenterId ? [provisionedCenterId] : [])] } } }),
    ]);
    assert.deepEqual({ centers, users, children, observations, reports }, { centers: 0, users: 0, children: 0, observations: 0, reports: 0 }, "Temporary integration fixtures were not fully cleaned up.");
  }
}

async function runReadOnlyIntegration(baseUrl: string, adminId: string) {
  const user = await prisma.user.findUnique({ where: { id: adminId } });
  assert.ok(user && user.active && ["CENTER_ADMIN", "DISTRICT_ADMIN"].includes(user.role), "TEST_FORECAST_ADMIN_USER_ID must identify an active database administrator.");
  const token = await new SignJWT({ role: user.role, centerIds: user.centerIds, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(config.authSecret));
  const endpoint = baseUrl.replace(/\/$/, "");
  const cookie = `${config.sessionCookie}=${token}`;
  const ready = await fetch(`${endpoint}/api/health/ready`);
  assert.equal(ready.status, 200, "SQLite readiness check failed.");
  const unauthorized = await fetch(`${endpoint}/api/v1/analytics/forecast`);
  assert.equal(unauthorized.status, 401, "Forecast endpoint accepted an unauthenticated request.");
  const historyResponse = await fetch(`${endpoint}/api/v1/analytics/forecast`, { headers: { cookie } });
  assert.equal(historyResponse.status, 200, `Forecast history GET failed: ${historyResponse.status}`);
  const history = await historyResponse.json();
  assert.equal(forecastDashboardSchema.safeParse(history.data).success, true, "Forecast response schema was invalid.");
  const leaked = JSON.stringify(history.data).toLowerCase();
  assert.ok(!leaked.includes("fullname") && !leaked.includes("childid"), "Aggregate response contained identifiable child fields.");
  const before = await prisma.mLPrediction.count({ where: { predictionType: "aggregate_monthly_observation_volume" } });
  const generated = await fetch(`${endpoint}/api/v1/analytics/forecast`, { method: "POST", headers: { cookie } });
  if (generated.status === 201) {
    const record = await generated.json();
    assert.equal(record.data.childId, null, "Aggregate forecast unexpectedly references a child.");
    const fetched = await fetch(`${endpoint}/api/v1/analytics/forecast`, { headers: { cookie } });
    const current = await fetched.json();
    assert.ok(current.data.forecasts.some((row: { id: string }) => row.id === record.data.id), "New prediction was not returned by the forecast GET.");
    console.log(JSON.stringify({ status: "PASS", mode: "read-only-existing-db", history_months: history.data.historyMonths, forecast_generation: "real artifact invoked and prediction persisted" }));
    return;
  }
  const error = await generated.json();
  assert.ok(["MODEL_NOT_CONFIGURED", "MODEL_ARTIFACT_MISSING", "MODEL_EVALUATION_INVALID", "INSUFFICIENT_HISTORY"].includes(error.error?.code), `Unexpected forecast failure: ${error.error?.code}`);
  assert.equal(await prisma.mLPrediction.count({ where: { predictionType: "aggregate_monthly_observation_volume" } }), before, "Rejected forecast wrote a prediction.");
  console.log(JSON.stringify({ status: "PASS", mode: "read-only-existing-db", history_months: history.data.historyMonths, forecast_generation: error.error.code, persistence_on_failure: "none" }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "SQLite integration test failed.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
