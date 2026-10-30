import test from "node:test";
import assert from "node:assert/strict";
import { buildDevelopmentJourney, calculateGrowthMetrics, interpretObservationAbility, theilSenGrowthSlope } from "./child-interpretation";
import type { GrowthMeasurement, MilestoneAssessment, MilestoneDefinition, Observation } from "./domain";

test("photo and voice ability percentages use only linked saved assessments", () => {
  const observation = { id: "photo-1", method: "PHOTO", childId: "child-1" } as Observation;
  const assessments = [
    { milestoneId: "m1", observationId: "photo-1", assessedAt: "2026-01-02T00:00:00.000Z", status: "MET" },
    { milestoneId: "m2", observationId: "photo-1", assessedAt: "2026-01-02T00:00:00.000Z", status: "NEEDS_REVIEW" },
    { milestoneId: "not-linked", observationId: null, assessedAt: "2026-01-02T00:00:00.000Z", status: "MET" },
  ] as MilestoneAssessment[];
  const result = interpretObservationAbility([observation], assessments, "PHOTO");
  assert.equal(result.achievementPercent, 50);
  assert.equal(result.assessedMilestones, 2);
});

test("BMI calculation uses the exact metric formula and does not classify a child", () => {
  const result = calculateGrowthMetrics({ heightCm: 100, weightKg: 15 });
  assert.equal(result?.bmi, 15);
});

test("Theil-Sen growth trend is resistant to a single extreme recorded value", () => {
  const rows = [
    { measuredAt: "2026-01-01T00:00:00.000Z", heightCm: 90, weightKg: 12 },
    { measuredAt: "2026-01-31T00:00:00.000Z", heightCm: 91, weightKg: 12.2 },
    { measuredAt: "2026-03-02T00:00:00.000Z", heightCm: 92, weightKg: 12.4 },
    { measuredAt: "2026-04-01T00:00:00.000Z", heightCm: 93, weightKg: 12.6 },
    { measuredAt: "2026-05-01T00:00:00.000Z", heightCm: 94, weightKg: 12.8 },
    { measuredAt: "2026-05-31T00:00:00.000Z", heightCm: 150, weightKg: 50 },
  ] as GrowthMeasurement[];
  const trend = theilSenGrowthSlope(rows);
  assert.ok(trend);
  assert.ok(trend.heightCmPer30Days < 2);
  assert.ok(trend.weightKgPer30Days < 1);
});

test("development journey puts dated assessments in the next age checkpoint and keeps the latest status", () => {
  const definitions = [{ id: "physical-1", domain: "PHYSICAL" }] as MilestoneDefinition[];
  const assessments = [
    { milestoneId: "physical-1", assessedAt: "2026-08-01T00:00:00.000Z", status: "IN_PROGRESS" },
    { milestoneId: "physical-1", assessedAt: "2026-10-01T00:00:00.000Z", status: "MET" },
  ] as MilestoneAssessment[];
  const points = buildDevelopmentJourney("2026-01-01", assessments, definitions, "PHYSICAL", [6, 12, 18], () => false);
  assert.equal(points[0].score, null);
  assert.equal(points[1].score, 100);
  assert.equal(points[1].state, "track");
});
