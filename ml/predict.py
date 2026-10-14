from __future__ import annotations

from pathlib import Path
import argparse
import json
import joblib
import pandas as pd
from data_validation import load_monthly_counts


def forecast_next_month(history: pd.Series, artifact_path: str) -> dict:
    artifact = Path(artifact_path)
    if not artifact.exists():
        raise FileNotFoundError("No evaluated model artifact is available; train and validate it first.")
    saved = joblib.load(artifact)
    index = history.index[-1] + 1
    month = index.month
    row = pd.DataFrame([{
        "lag_1": history.iloc[-1], "lag_2": history.iloc[-2], "lag_3": history.iloc[-3], "lag_12": history.iloc[-12],
        "month_sin": __import__("numpy").sin(2 * __import__("numpy").pi * month / 12),
        "month_cos": __import__("numpy").cos(2 * __import__("numpy").pi * month / 12),
    }], columns=saved["features"])
    value = max(0.0, float(saved["model"].predict(row)[0]))
    return {"prediction_type": "aggregate_monthly_observation_volume", "predicted_count": value, "month": str(index), "model_version": saved["version"], "input_data_cutoff": str(history.index[-1]), "confidence": None, "note": "Aggregate workload forecast only; not a prediction about any individual child."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("csv")
    parser.add_argument("--artifact", required=True)
    args = parser.parse_args()
    print(json.dumps(forecast_next_month(load_monthly_counts(args.csv), args.artifact)))
