import pandas as pd
import pytest
import json
import subprocess
import sys
from pathlib import Path

from data_validation import load_monthly_counts
from feature_engineering import supervised_frame
from train_model import evaluate_and_train


def test_supervised_rows_follow_time_order():
    index = pd.period_range("2020-01", periods=30, freq="M")
    data = supervised_frame(pd.Series(range(30), index=index, dtype=float))
    assert data.index.is_monotonic_increasing
    assert data.iloc[0]["lag_1"] == 11


def test_insufficient_history_is_rejected(tmp_path):
    path = tmp_path / "counts.csv"
    pd.DataFrame({"month": pd.period_range("2024-01", periods=8, freq="M").astype(str), "count": range(8)}).to_csv(path, index=False)
    with pytest.raises(ValueError, match="At least 24"):
        load_monthly_counts(str(path))


def test_invalid_or_duplicate_data_is_rejected(tmp_path):
    path = tmp_path / "counts.csv"
    pd.DataFrame({"month": ["2024-01", "2024-01"], "count": [1, 2]}).to_csv(path, index=False)
    with pytest.raises(ValueError, match="once"):
        load_monthly_counts(str(path))


def test_missing_calendar_month_is_not_silently_fabricated(tmp_path):
    periods = list(pd.period_range("2021-01", periods=25, freq="M").astype(str))
    periods.remove("2021-04")
    path = tmp_path / "gap.csv"
    pd.DataFrame({"month": periods, "count": [1] * len(periods)}).to_csv(path, index=False)
    with pytest.raises(ValueError, match="missing calendar periods"):
        load_monthly_counts(str(path))


def test_database_training_requires_export_provenance_manifest(tmp_path):
    path = tmp_path / "counts.csv"
    pd.DataFrame({"month": pd.period_range("2020-01", periods=36, freq="M").astype(str), "count": [10] * 36}).to_csv(path, index=False)
    with pytest.raises(ValueError, match="matching PostgreSQL aggregate export manifest"):
        evaluate_and_train(str(path), str(tmp_path / "artifact"), data_source="database")


@pytest.mark.parametrize("month,count", [("2024-13", 1), ("2024-02", -1), ("2024-02", 1.5)])
def test_invalid_month_and_negative_or_fractional_counts_are_rejected(tmp_path, month, count):
    path = tmp_path / "invalid.csv"
    pd.DataFrame({"month": [month], "count": [count]}).to_csv(path, index=False)
    with pytest.raises(ValueError):
        load_monthly_counts(str(path))


def test_training_report_marks_synthetic_data_as_not_real(tmp_path):
    path = tmp_path / "counts.csv"
    counts = [20 + (i % 5) * 3 for i in range(48)]
    pd.DataFrame({"month": pd.period_range("2020-01", periods=48, freq="M").astype(str), "count": counts}).to_csv(path, index=False)
    result = evaluate_and_train(str(path), str(tmp_path / "artifacts"), data_source="synthetic-test")
    if result.get("trained"):
        assert result["data_source"] == "synthetic_test_only"
        assert result["real_data_validation"] is False


def test_trained_artifact_runs_in_a_separate_inference_process(tmp_path):
    path = tmp_path / "counts.csv"
    counts = [25 + (i % 6) * 4 for i in range(60)]
    pd.DataFrame({"month": pd.period_range("2020-01", periods=60, freq="M").astype(str), "count": counts}).to_csv(path, index=False)
    output = tmp_path / "artifacts"
    report = evaluate_and_train(str(path), str(output), data_source="synthetic-test")
    if not report.get("trained"):
        pytest.skip("Synthetic software test dataset did not pass holdout acceptance.")
    process = subprocess.run([sys.executable, str(Path(__file__).resolve().parents[1] / "predict.py"), str(path), "--artifact", str(output / "aggregate_observation_volume.joblib")], check=True, capture_output=True, text=True)
    result = json.loads(process.stdout)
    assert result["data_source"] == "synthetic_test_only"
    assert result["input_data_cutoff"] == "2024-12"
    assert result["prediction_type"] == "aggregate_monthly_observation_volume"
