import { createHash } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { monthlyObservationCounts } from "@/lib/analytics-math";

/** Export organization-wide UTC monthly counts only. Never exports child identifiers. */
async function main() {
  if (process.env.DATA_MODE !== "sqlite" || !process.env.DATABASE_URL) throw new Error("Set DATA_MODE=sqlite and DATABASE_URL before exporting.");
  const observations = await prisma.observation.findMany({ where: { child: { active: true } }, select: { observedAt: true }, orderBy: { observedAt: "asc" } });
  const rows = monthlyObservationCounts(observations.map(({ observedAt }) => observedAt));
  if (!rows.length) throw new Error("No real observations found; no training dataset was exported.");
  if (rows.length < 24) throw new Error(`Insufficient consecutive monthly history: ${rows.length} months found; 24 required.`);
  const exportId = randomUUID();
  const directory = path.resolve(process.env.ML_EXPORT_DIR ?? "ml/private-data");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const output = path.join(directory, `monthly_observation_counts_${exportId}.csv`);
  const content = `month,count\n${rows.map(({ month, count }) => `${month},${count}`).join("\n")}\n`;
  await writeFile(output, content, { mode: 0o600 });
  await chmod(output, 0o600);
  const manifest = { data_source: "sqlite_aggregate_export", exported_at: new Date().toISOString(), month_count: rows.length, data_cutoff: rows.at(-1)?.month, sha256: createHash("sha256").update(content).digest("hex"), aggregation: "UTC calendar month count of persisted Observation records; empty months explicitly zero-filled" };
  await writeFile(`${output}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ output, month_count: rows.length, data_cutoff: manifest.data_cutoff, data_source: manifest.data_source }));
}

main().finally(() => prisma.$disconnect());
