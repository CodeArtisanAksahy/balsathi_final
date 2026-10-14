from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from feature_engineering import FEATURES, supervised_frame
from data_validation import load_monthly_counts


def evaluate_and_train(csv_path: str, output_dir: str) -> dict:
    series = load_monthly_counts(csv_path)
    data = supervised_frame(series)
    holdout = max(3, int(np.ceil(len(data) * 0.2)))
    if len(data) - holdout < 12:
        return {"trained": False, "reason": "Insufficient supervised rows for chronological evaluation."}
    train, test = data.iloc[:-holdout], data.iloc[-holdout:]
    candidate = RandomForestRegressor(n_estimators=200, max_depth=4, min_samples_leaf=2, random_state=42)
    candidate.fit(train[FEATURES], train["target"])
    prediction = np.maximum(0, candidate.predict(test[FEATURES]))
    baseline = np.maximum(0, test["lag_1"].to_numpy())
    metrics = {
        "test_months": len(test),
        "test_start": str(test.index.min()),
        "test_end": str(test.index.max()),
        "candidate_mae": float(mean_absolute_error(test["target"], prediction)),
        "candidate_rmse": float(np.sqrt(mean_squared_error(test["target"], prediction))),
        "baseline_mae": float(mean_absolute_error(test["target"], baseline)),
        "baseline_rmse": float(np.sqrt(mean_squared_error(test["target"], baseline))),
        "baseline": "last-month observation count",
        "split": "chronological; last 20% (minimum 3 months) held out",
        "dataset_cutoff": str(series.index.max()),
    }
    if metrics["candidate_mae"] >= metrics["baseline_mae"]:
        return {"trained": False, "reason": "Candidate did not outperform the baseline on held-out months.", "metrics": metrics}
    candidate.fit(data[FEATURES], data["target"])
    target = Path(output_dir)
    target.mkdir(parents=True, exist_ok=True)
    artifact = target / "aggregate_observation_volume.joblib"
    joblib.dump({"model": candidate, "features": FEATURES, "version": "aggregate-observation-volume-v1", "dataset_cutoff": str(series.index.max())}, artifact)
    report = {"trained": True, "model_name": "aggregate_observation_volume", "model_version": "v1", "trained_at": datetime.now(timezone.utc).isoformat(), "artifact": artifact.name, "features": FEATURES, "metrics": metrics, "target": "monthly aggregate observation count; not child-level and not a developmental prediction"}
    (target / "evaluation.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("csv")
    parser.add_argument("--output", default="ml/artifacts")
    args = parser.parse_args()
    print(json.dumps(evaluate_and_train(args.csv, args.output), indent=2))
