from __future__ import annotations

from pathlib import Path
import argparse
import json
import joblib
import pandas as pd
from data_validation import load_monthly_counts


def forecast_next_month(history: pd.Series, artifact_path: str) -> dict:
    import numpy as _np
    artifact = Path(artifact_path)
    if not artifact.exists():
        raise FileNotFoundError("No evaluated model artifact is available; train and validate it first.")
    if len(history) < 12:
        raise ValueError(f"History must contain at least 12 observations to supply all lag features; got {len(history)}.")
    lag_values = {
        "lag_1": history.iloc[-1],
        "lag_2": history.iloc[-2],
        "lag_3": history.iloc[-3],
        "lag_12": history.iloc[-12],
    }
    nan_lags = [k for k, v in lag_values.items() if _np.isnan(float(v))]
    if nan_lags:
        raise ValueError(f"History contains NaN values at lag positions {nan_lags}; cannot generate a valid prediction.")
    saved = joblib.load(artifact)
    if saved.get("data_source") not in {"sqlite_aggregate_export", "synthetic_test_only", "unverified"}:
        raise ValueError("Configured model artifact has an unknown training provenance.")
    if not saved.get("evaluation") or not saved.get("dataset_cutoff"):
        raise ValueError("Configured model artifact is missing evaluation or cutoff metadata.")
    index = history.index[-1] + 1
    month = index.month
    row = pd.DataFrame([{
        **lag_values,
        "month_sin": _np.sin(2 * _np.pi * month / 12),
        "month_cos": _np.cos(2 * _np.pi * month / 12),
    }], columns=saved["features"])
    value = max(0.0, float(saved["model"].predict(row)[0]))
    if history.index[-1] < pd.Period(saved["dataset_cutoff"], freq="M"):
        raise ValueError("Prediction history ends before the model's training cutoff; refusing stale input data.")
    return {"prediction_type": "aggregate_monthly_observation_volume", "predicted_count": value, "month": str(index), "model_version": saved["version"], "data_source": saved["data_source"], "input_data_cutoff": str(history.index[-1]), "training_data_cutoff": saved["dataset_cutoff"], "evaluation": saved["evaluation"], "confidence": None, "note": "Aggregate workload forecast only; not a prediction about any individual child."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("csv")
    parser.add_argument("--artifact", required=True)
    args = parser.parse_args()
    print(json.dumps(forecast_next_month(load_monthly_counts(args.csv), args.artifact)))
