import assert from "node:assert/strict";
import test from "node:test";
import { groupObservationCounts, milestoneCompletion } from "./analytics-math";

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
