export type MilestoneActivity = {
  status: string;
  active: boolean;
  minAgeMonths: number;
  maxAgeMonths: number;
  dateOfBirth: Date;
  assessedAt: Date;
};

export function ageInMonthsAt(dateOfBirth: Date, at: Date): number {
  let months = (at.getUTCFullYear() - dateOfBirth.getUTCFullYear()) * 12 + at.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (at.getUTCDate() < dateOfBirth.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function milestoneCompletion(items: MilestoneActivity[]) {
  const assessed = items.filter((item) => {
    const age = ageInMonthsAt(item.dateOfBirth, item.assessedAt);
    return item.active && age >= item.minAgeMonths && age < item.maxAgeMonths && !["NOT_OBSERVED", "NOT_ASSESSED", "NOT_APPLICABLE"].includes(item.status);
  });
  const achieved = assessed.filter((item) => item.status === "MET").length;
  return { achieved, assessed: assessed.length, completionPercent: assessed.length ? Math.round(achieved / assessed.length * 100) : null };
}

export function groupObservationCounts(observations: Array<{ observedAt: Date; followUpRequired: boolean }>) {
  const grouped = new Map<string, { observations: number; followUps: number }>();
  for (const observation of observations) {
    const month = observation.observedAt.toISOString().slice(0, 7);
    const value = grouped.get(month) ?? { observations: 0, followUps: 0 };
    value.observations += 1;
    if (observation.followUpRequired) value.followUps += 1;
    grouped.set(month, value);
  }
  return [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, ...value }));
}
