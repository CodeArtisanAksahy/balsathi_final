from __future__ import annotations

import pandas as pd
import numpy as np


def load_monthly_counts(path: str) -> pd.Series:
    """Load aggregate observations CSV with `month,count`; no child-level data is accepted."""
    frame = pd.read_csv(path)
    if not {"month", "count"}.issubset(frame.columns):
        raise ValueError("Input CSV must contain month,count columns.")
    frame = frame[["month", "count"]].copy()
    if frame.empty:
        raise ValueError("Monthly count data must contain at least one month.")
    raw_months = frame["month"].astype(str)
    parsed_months = pd.to_datetime(raw_months, errors="coerce")
    # Require an explicit calendar-month value, not an ambiguous timestamp/day.
    if parsed_months.isna().any() or not parsed_months.dt.strftime("%Y-%m").eq(raw_months).all():
        raise ValueError("Month values must use the exact YYYY-MM format.")
    frame["month"] = parsed_months.dt.to_period("M")
    frame["count"] = pd.to_numeric(frame["count"], errors="coerce")
    if frame.isna().any().any() or not np.isfinite(frame["count"]).all() or (frame["count"] < 0).any() or not np.equal(frame["count"], np.floor(frame["count"])).all():
        raise ValueError("Month must be valid and counts must be finite non-negative integers.")
    if frame["month"].duplicated().any():
        raise ValueError("Each month may appear only once.")
    frame = frame.sort_values("month")
    expected = pd.period_range(frame["month"].iloc[0], frame["month"].iloc[-1], freq="M")
    if not frame["month"].reset_index(drop=True).equals(pd.Series(expected)):
        raise ValueError("Monthly dataset contains missing calendar periods; supply a complete consecutive series with explicit zero counts.")
    series = frame.set_index("month")["count"].asfreq("M")
    if len(series) < 24:
        raise ValueError(f"At least 24 consecutive months are required; received {len(series)}.")
    return series.astype(float)
