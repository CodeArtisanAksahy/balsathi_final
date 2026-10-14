import pandas as pd
import pytest

from data_validation import load_monthly_counts
from feature_engineering import supervised_frame


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
