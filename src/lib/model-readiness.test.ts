import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { getForecastModelReadiness } from "./database-service";

const previousModelPath = process.env.ML_MODEL_PATH;
const previousEvaluationPath = process.env.ML_EVALUATION_PATH;
let directory: string | undefined;

afterEach(async () => {
  if (previousModelPath === undefined) delete process.env.ML_MODEL_PATH;
  else process.env.ML_MODEL_PATH = previousModelPath;
  if (previousEvaluationPath === undefined) delete process.env.ML_EVALUATION_PATH;
  else process.env.ML_EVALUATION_PATH = previousEvaluationPath;
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = undefined;
});

describe("forecast model readiness", () => {
  it("distinguishes missing configuration and artifact", async () => {
    delete process.env.ML_MODEL_PATH;
    expect(await getForecastModelReadiness()).toBe("not_configured");
    process.env.ML_MODEL_PATH = path.join(tmpdir(), "balsathi-missing-model-artifact");
    expect(await getForecastModelReadiness()).toBe("artifact_missing");
  });

  it("rejects invalid provenance, insufficient history, and models that do not beat baseline", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "balsathi-model-readiness-"));
    const artifact = path.join(directory, "model.bin");
    const evaluationPath = path.join(directory, "evaluation.json");
    await writeFile(artifact, "isolated synthetic test artifact");
    const artifact_sha256 = createHash("sha256").update(await readFile(artifact)).digest("hex");
    process.env.ML_MODEL_PATH = artifact;
    process.env.ML_EVALUATION_PATH = evaluationPath;
    const valid = {
      trained: true, model_name: "aggregate_observation_volume", model_version: "test-version",
      data_source: "sqlite_aggregate_export", real_data_validation: true, artifact_sha256,
      data_cutoff: "2025-12", sample_count: 24,
      metrics: { candidate_mae: 1, candidate_rmse: 1, baseline_mae: 2, baseline_rmse: 2, test_months: 3, dataset_cutoff: "2025-12" },
    };
    await writeFile(evaluationPath, JSON.stringify({ ...valid, real_data_validation: false }));
    expect(await getForecastModelReadiness()).toBe("evaluation_invalid");
    await writeFile(evaluationPath, JSON.stringify({ ...valid, sample_count: 23 }));
    expect(await getForecastModelReadiness()).toBe("evaluation_invalid");
    await writeFile(evaluationPath, JSON.stringify({ ...valid, metrics: { ...valid.metrics, candidate_mae: 2 } }));
    expect(await getForecastModelReadiness()).toBe("evaluation_invalid");
  });
});
