import type { DevelopmentDomain, GrowthMeasurement, MilestoneAssessment, MilestoneDefinition, Observation } from "./domain";

export type JourneyPoint = { ageIndex: number; score: number | null; state: "none" | "track" | "support" | "risk" };

/**
 * Event-sweep algorithm for the Development Journey graph.
 *
 * 1. Sorts persisted assessment events by their real assessment time.
 * 2. Uses binary search to place each event at the first visible age checkpoint.
 * 3. Maintains the newest status for each milestone in a Map.
 * 4. At each checkpoint, calculates MET / (MET + IN_PROGRESS + NEEDS_REVIEW).
 *
 * This never fills empty points with estimates: a null point means no eligible
 * dated assessment exists. The denominator is the exact set of latest recorded
 * assessments at that checkpoint.
 */
export function buildDevelopmentJourney(
  birthDate: string | Date,
  assessments: MilestoneAssessment[],
  definitions: MilestoneDefinition[],
  domain: DevelopmentDomain,
  checkpoints: number[],
  hasHighRisk: (assessment: MilestoneAssessment) => boolean,
): JourneyPoint[] {
  const domainMilestones = new Set(definitions.filter((definition) => definition.domain === domain).map((definition) => definition.id));
  const events = assessments
    .filter((assessment) => domainMilestones.has(assessment.milestoneId))
    .map((assessment) => {
      const ageMonths = ageInMonthsAt(birthDate, assessment.assessedAt);
      return { assessment, ageMonths, checkpointIndex: Math.min(upperBound(checkpoints, ageMonths), checkpoints.length - 1) };
    })
    .filter((event) => event.ageMonths >= 0 && checkpoints.length > 0)
    .sort((left, right) => left.assessment.assessedAt.localeCompare(right.assessment.assessedAt));
  const points: JourneyPoint[] = [];
  const latest = new Map<string, MilestoneAssessment>();
  let eventIndex = 0;
  for (let ageIndex = 0; ageIndex < checkpoints.length; ageIndex += 1) {
    while (eventIndex < events.length && events[eventIndex].checkpointIndex <= ageIndex) {
      latest.set(events[eventIndex].assessment.milestoneId, events[eventIndex].assessment);
      eventIndex += 1;
    }
    const counted = [...latest.values()].filter((assessment) => ["MET", "IN_PROGRESS", "NEEDS_REVIEW"].includes(assessment.status));
    if (!counted.length) { points.push({ ageIndex, score: null, state: "none" }); continue; }
    const score = Math.round((counted.filter((assessment) => assessment.status === "MET").length / counted.length) * 100);
    points.push({ ageIndex, score, state: counted.some(hasHighRisk) ? "risk" : counted.some((assessment) => assessment.status !== "MET") ? "support" : "track" });
  }
  return points;
}

function upperBound(sorted: number[], value: number) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (sorted[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

function ageInMonthsAt(birthDate: string | Date, assessedAt: string | Date) {
  const birth = new Date(birthDate);
  const assessed = new Date(assessedAt);
  let months = (assessed.getUTCFullYear() - birth.getUTCFullYear()) * 12 + assessed.getUTCMonth() - birth.getUTCMonth();
  if (assessed.getUTCDate() < birth.getUTCDate()) months -= 1;
  return months;
}

/**
 * Deterministic interpretation for photo/voice observations.
 *
 * This deliberately never infers an ability from pixels, audio, or free text.
 * A percentage is displayed only when an authorised worker has linked a saved
 * milestone assessment to the observation; its denominator is exactly the
 * number of assessed milestones, not a guessed total.
 */
export function interpretObservationAbility(observations: Observation[], assessments: MilestoneAssessment[], method: "PHOTO" | "VOICE") {
  const source = observations.filter((observation) => observation.method === method);
  const sourceIds = new Set(source.map((observation) => observation.id));
  const linked = assessments.filter((assessment) => assessment.observationId && sourceIds.has(assessment.observationId));
  const latestByMilestone = new Map<string, MilestoneAssessment>();
  for (const assessment of linked.sort((left, right) => right.assessedAt.localeCompare(left.assessedAt))) {
    if (!latestByMilestone.has(assessment.milestoneId)) latestByMilestone.set(assessment.milestoneId, assessment);
  }
  const reviewed = [...latestByMilestone.values()].filter((assessment) => ["MET", "IN_PROGRESS", "NEEDS_REVIEW"].includes(assessment.status));
  const met = reviewed.filter((assessment) => assessment.status === "MET").length;
  return {
    method,
    observationCount: source.length,
    assessedMilestones: reviewed.length,
    metMilestones: met,
    achievementPercent: reviewed.length ? Math.round((met / reviewed.length) * 100) : null,
    needsReview: reviewed.filter((assessment) => assessment.status === "NEEDS_REVIEW").length,
    interpretation: reviewed.length
      ? "Percentage is calculated from the latest worker-recorded linked milestone assessments."
      : "No percentage is shown until a worker links and assesses a milestone.",
  };
}

/** Exact BMI calculation. It does not apply adult BMI labels to children. */
export function calculateGrowthMetrics(measurement: Pick<GrowthMeasurement, "heightCm" | "weightKg"> | null) {
  if (!measurement || !Number.isFinite(measurement.heightCm) || !Number.isFinite(measurement.weightKg) || measurement.heightCm <= 0 || measurement.weightKg <= 0) return null;
  const heightM = measurement.heightCm / 100;
  return { bmi: measurement.weightKg / (heightM * heightM) };
}

/** Growth movement uses actual consecutive saved measurements; no reference percentile is invented. */
export function calculateGrowthTrend(measurements: GrowthMeasurement[]) {
  const sorted = [...measurements].sort((left, right) => left.measuredAt.localeCompare(right.measuredAt));
  if (sorted.length < 2) return null;
  const previous = sorted.at(-2)!;
  const latest = sorted.at(-1)!;
  const elapsedDays = (new Date(latest.measuredAt).getTime() - new Date(previous.measuredAt).getTime()) / 86_400_000;
  if (!Number.isFinite(elapsedDays) || elapsedDays <= 0) return null;
  const robust = theilSenGrowthSlope(sorted);
  return {
    heightChangeCm: latest.heightCm - previous.heightCm,
    weightChangeKg: latest.weightKg - previous.weightKg,
    elapsedDays,
    // Median of all valid pairwise slopes. Unlike a simple first/last slope,
    // one accidental entry cannot dominate the displayed trend.
    heightCmPer30Days: robust?.heightCmPer30Days ?? null,
    weightKgPer30Days: robust?.weightKgPer30Days ?? null,
  };
}

/**
 * Theil–Sen robust regression implemented with a sorted slope array and median
 * selection. It uses only persisted timestamps and measurements. At least three
 * records are required so the result is an estimate rather than a two-point
 * difference. The number of records on a child profile is intentionally small,
 * making the O(n²) pair construction transparent and reliable.
 */
export function theilSenGrowthSlope(measurements: GrowthMeasurement[]) {
  const rows = [...measurements].sort((left, right) => left.measuredAt.localeCompare(right.measuredAt));
  if (rows.length < 3) return null;
  const heightSlopes: number[] = [];
  const weightSlopes: number[] = [];
  for (let start = 0; start < rows.length - 1; start += 1) {
    for (let end = start + 1; end < rows.length; end += 1) {
      const elapsedDays = (new Date(rows[end].measuredAt).getTime() - new Date(rows[start].measuredAt).getTime()) / 86_400_000;
      if (!Number.isFinite(elapsedDays) || elapsedDays <= 0) continue;
      heightSlopes.push((rows[end].heightCm - rows[start].heightCm) / elapsedDays);
      weightSlopes.push((rows[end].weightKg - rows[start].weightKg) / elapsedDays);
    }
  }
  if (!heightSlopes.length || !weightSlopes.length) return null;
  return { heightCmPer30Days: median(heightSlopes) * 30, weightKgPer30Days: median(weightSlopes) * 30 };
}

function median(values: number[]) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}
