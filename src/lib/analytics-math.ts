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

/** Count persisted observation dates in UTC months and explicitly include empty months as zero. */
export function monthlyObservationCounts(values: Date[]) {
  if (values.length === 0) return [] as Array<{ month: string; count: number }>;
  const dates = values.slice().sort((a, b) => a.getTime() - b.getTime());
  const counts = new Map<string, number>();
  for (const date of dates) {
    if (!Number.isFinite(date.getTime())) throw new Error("Observation date must be valid.");
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  const cursor = new Date(Date.UTC(dates[0].getUTCFullYear(), dates[0].getUTCMonth(), 1));
  const end = new Date(Date.UTC(dates.at(-1)!.getUTCFullYear(), dates.at(-1)!.getUTCMonth(), 1));
  const result: Array<{ month: string; count: number }> = [];
  for (; cursor <= end; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    const month = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    result.push({ month, count: counts.get(month) ?? 0 });
  }
  return result;
}

export function completeMonthlyCounts(values: Array<{ month: string; count: number }>) {
  const counts = new Map<string, number>();
  for (const row of values) {
    const monthNumber = Number(row.month.slice(5, 7));
    if (!/^\d{4}-\d{2}$/.test(row.month) || monthNumber < 1 || monthNumber > 12 || !Number.isSafeInteger(row.count) || row.count < 0 || counts.has(row.month)) throw new Error("Monthly aggregate rows must contain unique valid months and non-negative integer counts.");
    counts.set(row.month, row.count);
  }
  const months = [...counts.keys()].sort();
  if (!months.length) return [] as Array<{ month: string; count: number }>;
  const [startYear, startMonth] = months[0].split("-").map(Number);
  const [endYear, endMonth] = months.at(-1)!.split("-").map(Number);
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const end = new Date(Date.UTC(endYear, endMonth - 1, 1));
  const result: Array<{ month: string; count: number }> = [];
  for (; cursor <= end; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    const month = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    result.push({ month, count: counts.get(month) ?? 0 });
  }
  return result;
}
