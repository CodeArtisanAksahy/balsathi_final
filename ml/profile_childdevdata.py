"""Profile official childdevdata R datasets without creating clinical targets.

The package combines distinct instruments. This script therefore records source
instrument prefixes and item availability, but never turns unobserved items into
negative responses or invents Balsathi domain labels.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import warnings
from collections import Counter
from datetime import date, timezone, datetime
from pathlib import Path
from typing import Any

import pandas as pd
import rdata

METADATA_COLUMNS = {"ctrycd", "cohort", "cohortn", "subjid", "agedays", "sex", "gagebrth"}


def item_columns(frame: pd.DataFrame) -> list[str]:
    return [str(column) for column in frame.columns if str(column) not in METADATA_COLUMNS]


def instrument_prefix(column: str) -> str:
    match = re.match(r"([a-z]+)", column.lower())
    return match.group(1)[:3] if match else "unknown"


def profile_frames(frames: dict[str, pd.DataFrame]) -> tuple[dict[str, Any], pd.DataFrame]:
    rows: list[pd.DataFrame] = []
    dataset_summaries: list[dict[str, Any]] = []
    column_missing: Counter[str] = Counter()
    column_total: Counter[str] = Counter()
    all_instruments: Counter[str] = Counter()
    all_columns: set[str] = set()
    duplicate_visits = 0
    response_values: Counter[str] = Counter()

    for dataset, frame in frames.items():
        if not METADATA_COLUMNS.issubset(set(frame.columns)):
            missing = sorted(METADATA_COLUMNS - set(frame.columns))
            raise ValueError(f"{dataset} lacks required child/visit metadata: {missing}")
        items = item_columns(frame)
        all_columns.update(map(str, frame.columns))
        for column in frame.columns:
            column_total[str(column)] += len(frame)
            column_missing[str(column)] += int(frame[column].isna().sum())
        all_instruments.update(instrument_prefix(column) for column in items)
        visit_keys = frame[["cohort", "subjid", "agedays"]].astype(str)
        duplicate_visits += int(visit_keys.duplicated().sum())
        observed_item_count = frame[items].notna().sum(axis=1) if items else pd.Series(0, index=frame.index)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", FutureWarning)
            values = frame[items].stack(dropna=True).astype(str).value_counts()
        for value, count in values.items():
            response_values[value] += int(count)
        rows.append(pd.DataFrame({
            "dataset": dataset,
            "cohort": frame["cohort"].astype("string"),
            "country_code": frame["ctrycd"].astype("string"),
            "child_key": frame["cohort"].astype(str) + ":" + frame["subjid"].astype(str),
            "age_days": pd.to_numeric(frame["agedays"], errors="coerce"),
            "sex": frame["sex"].astype("string"),
            "available_item_count": observed_item_count.astype(int),
        }))
        dataset_summaries.append({
            "dataset": dataset,
            "assessment_records": int(len(frame)),
            "unique_children": int((frame["cohort"].astype(str) + ":" + frame["subjid"].astype(str)).nunique()),
            "columns": int(len(frame.columns)),
            "milestone_columns": int(len(items)),
            "age_days_min": _finite_min(frame["agedays"]),
            "age_days_max": _finite_max(frame["agedays"]),
            "instruments": sorted({instrument_prefix(column) for column in items}),
        })

    assessment_index = pd.concat(rows, ignore_index=True)
    missing_pct = {column: round((column_missing[column] / column_total[column]) * 100, 4) for column in sorted(column_total)}
    profile = {
        "profile_format_version": 1,
        "source": "https://github.com/D-score/childdevdata",
        "licence": "CC-BY-4.0 (verify source LICENSE.md before redistribution)",
        "downloaded_at_utc": datetime.now(timezone.utc).isoformat(),
        "datasets": dataset_summaries,
        "assessment_records": int(len(assessment_index)),
        "unique_children": int(assessment_index["child_key"].nunique()),
        "cohorts": sorted(assessment_index["cohort"].dropna().unique().tolist()),
        "studies": int(assessment_index["cohort"].nunique()),
        "instrument_prefixes": dict(sorted(all_instruments.items())),
        "available_columns": sorted(all_columns),
        "age_unit": "days (agedays)",
        "age_distribution_days": _distribution(assessment_index["age_days"]),
        "missing_percentage_by_column": missing_pct,
        "duplicate_visit_records": duplicate_visits,
        "response_value_distribution": dict(sorted(response_values.items())),
        "outcome_assessment": {
            "validated_four_domain_target_available": False,
            "reason": "The source supplies instrument-specific milestone responses; it does not supply four harmonised Balsathi domain labels.",
            "supported_research_output": "D-score/DAZ requires approved GSED item mapping and the D-score reference implementation; it is not trained or enabled by this pipeline.",
        },
    }
    return profile, assessment_index


def read_source(source_dir: Path) -> dict[str, pd.DataFrame]:
    data_dir = source_dir / "data"
    files = sorted(data_dir.glob("*.rda"))
    if not files:
        raise FileNotFoundError(f"No .rda datasets found in {data_dir}")
    frames: dict[str, pd.DataFrame] = {}
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for path in files:
            loaded = rdata.read_rda(path)
            for name, value in loaded.items():
                if not isinstance(value, pd.DataFrame):
                    raise TypeError(f"{path.name}:{name} was not a data frame")
                frames[str(name)] = value
    return frames


def write_outputs(profile: dict[str, Any], assessment_index: pd.DataFrame, source_dir: Path, processed_dir: Path, report_path: Path) -> None:
    processed_dir.mkdir(parents=True, exist_ok=True)
    assessment_index.to_csv(processed_dir / "assessment_index.csv.gz", index=False, compression="gzip")
    profile["source_revision"] = subprocess.check_output(["git", "-C", str(source_dir), "rev-parse", "HEAD"], text=True).strip()
    (processed_dir / "dataset_profile.json").write_text(json.dumps(profile, indent=2, default=str), encoding="utf-8")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(render_markdown(profile), encoding="utf-8")


def render_markdown(profile: dict[str, Any]) -> str:
    lines = ["# childdevdata dataset profile", "", f"- Source: {profile['source']}", f"- Revision: `{profile['source_revision']}`", f"- Downloaded/profiled: {profile['downloaded_at_utc']}", f"- Licence: {profile['licence']}", f"- Assessment records: {profile['assessment_records']:,}", f"- Unique children (cohort + subjid): {profile['unique_children']:,}", f"- Studies/cohorts: {profile['studies']}", f"- Age unit: {profile['age_unit']}", f"- Duplicate visit records (cohort + subjid + agedays): {profile['duplicate_visit_records']}", "", "## Dataset summaries", "", "| Dataset | Assessments | Unique children | Columns | Milestone columns | Age range (days) | Instruments |", "| --- | ---: | ---: | ---: | ---: | --- | --- |"]
    for dataset in profile["datasets"]:
        lines.append(f"| {dataset['dataset']} | {dataset['assessment_records']:,} | {dataset['unique_children']:,} | {dataset['columns']} | {dataset['milestone_columns']} | {dataset['age_days_min']}–{dataset['age_days_max']} | {', '.join(dataset['instruments'])} |")
    lines.extend(["", "## Data quality", "", f"- Age distribution (days): `{json.dumps(profile['age_distribution_days'])}`", f"- Response values observed: `{json.dumps(profile['response_value_distribution'])}`", "- Full per-column missingness is stored in ignored `ml/private-data/processed/dataset_profile.json`.", "", "## Model suitability", "", "The package contains instrument-specific item responses, not four validated Balsathi domain targets. No child-level ML model, health category, risk score or four-domain prediction is trained or enabled. Missing values remain missing; they are never converted to a negative milestone result.", "", "A D-score/DAZ research calculation may only be considered after an approved mapping from Balsathi’s recorded milestone definitions to the required GSED item schema and an independent population/generalisation review. This dataset includes no Indian cohort, so it cannot validate predictions for Balsathi users in India.", "", "## Processing", "", "Raw source is retained under ignored `ml/private-data/childdevdata-source`. The processed `assessment_index.csv.gz` contains pseudonymous cohort/child keys, age and item-availability counts only; it excludes Balsathi records. Re-run with `python3 ml/profile_childdevdata.py`."])
    return "\n".join(lines) + "\n"


def _finite_min(values: pd.Series) -> int | None:
    converted = pd.to_numeric(values, errors="coerce").dropna()
    return int(converted.min()) if not converted.empty else None


def _finite_max(values: pd.Series) -> int | None:
    converted = pd.to_numeric(values, errors="coerce").dropna()
    return int(converted.max()) if not converted.empty else None


def _distribution(values: pd.Series) -> dict[str, float | int | None]:
    converted = pd.to_numeric(values, errors="coerce").dropna()
    if converted.empty:
        return {"count": 0, "min": None, "p25": None, "median": None, "p75": None, "max": None}
    return {"count": int(len(converted)), "min": int(converted.min()), "p25": float(converted.quantile(.25)), "median": float(converted.median()), "p75": float(converted.quantile(.75)), "max": int(converted.max())}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("ml/private-data/childdevdata-source"))
    parser.add_argument("--processed", type=Path, default=Path("ml/private-data/processed"))
    parser.add_argument("--report", type=Path, default=Path("reports/dataset_profile.md"))
    args = parser.parse_args()
    profile, index = profile_frames(read_source(args.source))
    write_outputs(profile, index, args.source, args.processed, args.report)
    print(json.dumps({"assessment_records": profile["assessment_records"], "unique_children": profile["unique_children"], "studies": profile["studies"]}))
