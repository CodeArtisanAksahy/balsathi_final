from __future__ import annotations

import pandas as pd


def load_monthly_counts(path: str) -> pd.Series:
    """Load aggregate observations CSV with `month,count`; no child-level data is accepted."""
    frame = pd.read_csv(path)
    if not {"month", "count"}.issubset(frame.columns):
        raise ValueError("Input CSV must contain month,count columns.")
    frame = frame[["month", "count"]].copy()
    frame["month"] = pd.to_datetime(frame["month"], errors="coerce").dt.to_period("M")
    frame["count"] = pd.to_numeric(frame["count"], errors="coerce")
    if frame.isna().any().any() or (frame["count"] < 0).any():
        raise ValueError("Month must be valid and counts must be non-negative numbers.")
    if frame["month"].duplicated().any():
        raise ValueError("Each month may appear only once.")
    series = frame.set_index("month")["count"].sort_index().asfreq("M", fill_value=0)
    if len(series) < 24:
        raise ValueError(f"At least 24 consecutive months are required; received {len(series)}.")
    return series.astype(float)
