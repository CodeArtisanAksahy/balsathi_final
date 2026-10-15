import assert from "node:assert/strict";
import test from "node:test";
import { groupObservationCounts, milestoneCompletion, monthlyObservationCounts } from "./analytics-math";
import { forecastDashboardSchema } from "./forecast-contract";

test("milestone completion excludes non-assessed and age-inapplicable records", () => {
  const dateOfBirth = new Date("2023-01-15T00:00:00.000Z");
  const assessedAt = new Date("2024-01-16T00:00:00.000Z");
  const result = milestoneCompletion([
    { status: "MET", active: true, minAgeMonths: 12, maxAgeMonths: 24, dateOfBirth, assessedAt },
    { status: "NOT_OBSERVED", active: true, minAgeMonths: 12, maxAgeMonths: 24, dateOfBirth, assessedAt },
    { status: "NOT_APPLICABLE", active: true, minAgeMonths: 12, maxAgeMonths: 24, dateOfBirth, assessedAt },
    { status: "MET", active: true, minAgeMonths: 24, maxAgeMonths: 36, dateOfBirth, assessedAt },
  ]);
  assert.deepEqual(result, { achieved: 1, assessed: 1, completionPercent: 100 });
  assert.equal(milestoneCompletion([]).completionPercent, null);
});

test("observation analytics groups persisted records by UTC month", () => {
  const result = groupObservationCounts([
    { observedAt: new Date("2025-02-01T00:00:00.000Z"), followUpRequired: true },
    { observedAt: new Date("2025-01-31T23:00:00.000Z"), followUpRequired: false },
    { observedAt: new Date("2025-02-14T00:00:00.000Z"), followUpRequired: false },
  ]);
  assert.deepEqual(result, [
    { month: "2025-01", observations: 1, followUps: 0 },
    { month: "2025-02", observations: 2, followUps: 1 },
  ]);
});

test("forecast aggregation returns actual UTC monthly counts and zero-filled calendar gaps", () => {
  assert.deepEqual(monthlyObservationCounts([new Date("2024-03-02T00:00:00Z"), new Date("2024-01-31T23:00:00Z"), new Date("2024-01-31T23:00:00Z")]), [
    { month: "2024-01", count: 2 }, { month: "2024-02", count: 0 }, { month: "2024-03", count: 1 },
  ]);
});

test("forecast API contract rejects invalid counts and identifies actuals separately", () => {
  const base = { history: [{ month: "2024-01", count: 4 }], forecasts: [], evaluation: null, historyMonths: 1 };
  assert.equal(forecastDashboardSchema.safeParse(base).success, true);
  assert.equal(forecastDashboardSchema.safeParse({ ...base, history: [{ month: "2024-01", count: -1 }] }).success, false);
});
