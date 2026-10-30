from __future__ import annotations

import pandas as pd
import pytest

from train_childdevdata_research import build_frame, grouped_split


def test_training_frame_preserves_missingness_and_drops_exact_repeated_visits():
    frame = pd.DataFrame({"cohort": ["A", "A", "A", "A"], "subjid": [1, 1, 1, 2], "agedays": [10, 10, 20, 10], "item": [1, 1, None, 0]})
    result = build_frame(frame, "item")
    assert result[["child_key", "age_days", "target"]].to_dict("records") == [{"child_key": "A:1", "age_days": 10, "target": 1}, {"child_key": "A:2", "age_days": 10, "target": 0}]


def test_grouped_split_never_places_one_child_in_both_sets():
    frame = pd.DataFrame({"child_key": [f"A:{index // 2}" for index in range(20)], "target": [index % 2 for index in range(20)], "age_days": list(range(20))})
    train, test = grouped_split(frame, test_size=.3, seed=42)
    assert set(train.child_key).isdisjoint(set(test.child_key))


def test_training_frame_rejects_missing_source_columns():
    with pytest.raises(ValueError, match="Missing source columns"):
        build_frame(pd.DataFrame({"agedays": [1]}), "item")
