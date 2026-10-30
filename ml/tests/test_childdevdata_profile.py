from __future__ import annotations

import pandas as pd

from profile_childdevdata import profile_frames


def test_profile_distinguishes_children_from_repeated_assessment_rows():
    frame = pd.DataFrame({
        "ctrycd": ["TST", "TST", "TST"],
        "cohort": ["C1", "C1", "C1"],
        "cohortn": [1, 1, 1],
        "subjid": [10, 10, 11],
        "agedays": [100, 200, 100],
        "sex": ["Female", "Female", "Male"],
        "gagebrth": [280, 280, 280],
        "abc001": [1, None, 0],
    })
    profile, index = profile_frames({"example": frame})
    assert profile["assessment_records"] == 3
    assert profile["unique_children"] == 2
    assert profile["duplicate_visit_records"] == 0
    assert profile["missing_percentage_by_column"]["abc001"] == round(100 / 3, 4)
    assert index["available_item_count"].tolist() == [1, 0, 1]
