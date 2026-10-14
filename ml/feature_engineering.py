from __future__ import annotations

import pandas as pd

FEATURES = ["lag_1", "lag_2", "lag_3", "lag_12", "month_sin", "month_cos"]


def supervised_frame(series: pd.Series) -> pd.DataFrame:
    frame = pd.DataFrame({"target": series})
    for lag in (1, 2, 3, 12):
        frame[f"lag_{lag}"] = series.shift(lag)
    month = frame.index.month
    frame["month_sin"] = __import__("numpy").sin(2 * __import__("numpy").pi * month / 12)
    frame["month_cos"] = __import__("numpy").cos(2 * __import__("numpy").pi * month / 12)
    return frame.dropna()
