"""Train a research-only, instrument-specific milestone-response model.

This is deliberately not Balsathi inference. It models one documented source
item using only age at assessment and keeps children grouped across splits. An
approved mapping and external validation are required before any deployment.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from profile_childdevdata import read_source

RESEARCH_LIMITATION = (
    "Research-only estimate of one documented source-instrument response from age. "
    "It is not a Balsathi child prediction, developmental diagnosis, risk flag, percentile, D-score, or clinical decision."
)


def build_frame(frame: pd.DataFrame, target: str) -> pd.DataFrame:
    required = {"cohort", "subjid", "agedays", target}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Missing source columns: {sorted(missing)}")
    prepared = frame[["cohort", "subjid", "agedays", target]].copy()
    prepared["age_days"] = pd.to_numeric(prepared.pop("agedays"), errors="coerce")
    prepared["target"] = pd.to_numeric(prepared.pop(target), errors="coerce")
    prepared = prepared.dropna(subset=["age_days", "target"])
    prepared = prepared[prepared["target"].isin([0, 1]) & prepared["age_days"].between(0, 2191)]
    prepared["target"] = prepared["target"].astype(int)
    prepared["child_key"] = prepared["cohort"].astype(str) + ":" + prepared["subjid"].astype(str)
    # A repeated visit is not a new training example. Preserve separate visits at
    # different ages, but deterministically remove exact duplicates.
    return prepared.drop_duplicates(["child_key", "age_days"], keep="last").reset_index(drop=True)


def grouped_split(frame: pd.DataFrame, *, test_size: float, seed: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    groups = frame["child_key"].to_numpy()
    train_index, test_index = next(GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=seed).split(frame, frame["target"], groups))
    return frame.iloc[train_index].copy(), frame.iloc[test_index].copy()


def evaluate(model: Any, frame: pd.DataFrame) -> dict[str, float | int]:
    features = frame[["age_days"]]
    truth = frame["target"].to_numpy()
    prediction = model.predict(features)
    result: dict[str, float | int] = {
        "records": int(len(frame)), "children": int(frame["child_key"].nunique()),
        "positive_count": int(truth.sum()), "negative_count": int((truth == 0).sum()),
        "accuracy": float(accuracy_score(truth, prediction)),
        "balanced_accuracy": float(balanced_accuracy_score(truth, prediction)),
        "precision": float(precision_score(truth, prediction, zero_division=0)),
        "recall": float(recall_score(truth, prediction, zero_division=0)),
        "f1": float(f1_score(truth, prediction, zero_division=0)),
    }
    if len(np.unique(truth)) == 2 and callable(getattr(model, "predict_proba", None)):
        result["roc_auc"] = float(roc_auc_score(truth, model.predict_proba(features)[:, 1]))
    return result


def train(source: Path, output_dir: Path, report_path: Path, *, dataset: str = "gcdg_nld_smocc", target: str = "ddicmm037", seed: int = 42) -> dict[str, Any]:
    frames = read_source(source)
    if dataset not in frames:
        raise ValueError(f"Unknown dataset {dataset!r}")
    all_rows = build_frame(frames[dataset], target)
    if all_rows["target"].nunique() != 2 or min(all_rows["target"].value_counts()) < 20:
        raise ValueError("The selected documented source target has insufficient two-class label coverage.")
    train_valid, test = grouped_split(all_rows, test_size=.2, seed=seed)
    train, validation = grouped_split(train_valid, test_size=.25, seed=seed + 1)
    candidates: dict[str, Any] = {
        "logistic_regression": Pipeline([("scaler", StandardScaler()), ("classifier", LogisticRegression(random_state=seed, max_iter=1_000))]),
        "random_forest": Pipeline([("classifier", RandomForestClassifier(n_estimators=300, min_samples_leaf=8, random_state=seed, n_jobs=1))]),
    }
    validation_scores: dict[str, dict[str, float | int]] = {}
    for name, model in candidates.items():
        model.fit(train[["age_days"]], train["target"])
        validation_scores[name] = evaluate(model, validation)
    selected_name = max(validation_scores, key=lambda name: (float(validation_scores[name]["balanced_accuracy"]), float(validation_scores[name]["f1"])))
    baseline = DummyClassifier(strategy="most_frequent").fit(train_valid[["age_days"]], train_valid["target"])
    selected = candidates[selected_name].fit(train_valid[["age_days"]], train_valid["target"])
    test_metrics = evaluate(selected, test)
    baseline_metrics = evaluate(baseline, test)
    output_dir.mkdir(parents=True, exist_ok=True)
    artifact = output_dir / "research_age_to_item_response.joblib"
    joblib.dump({"pipeline": selected, "dataset": dataset, "target": target, "features": ["age_days"], "research_only": True, "limitation": RESEARCH_LIMITATION}, artifact)
    result = {
        "model_version": "childdevdata-research-age-item-v1",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset": dataset,
        "target": target,
        "target_definition": "Recorded 0/1 response for a documented source-instrument milestone.",
        "features": ["age_days"],
        "split": {"seed": seed, "strategy": "GroupShuffleSplit by cohort:subjid; 60% train, 20% validation, 20% held-out test", "train": {"records": len(train), "children": int(train.child_key.nunique())}, "validation": {"records": len(validation), "children": int(validation.child_key.nunique())}, "test": {"records": len(test), "children": int(test.child_key.nunique())}},
        "candidate_validation_metrics": validation_scores,
        "selected_model": selected_name,
        "held_out_test_metrics": test_metrics,
        "held_out_baseline_metrics": baseline_metrics,
        "artifact": artifact.name,
        "artifact_sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
        "research_only": True,
        "limitations": [RESEARCH_LIMITATION, "The source cohort is Netherlands SMOCC; results cannot be transferred to Balsathi users or the Indian population.", "The model includes no Balsathi records, identifiers, free text, photo, voice, sex, or health data.", "It does not estimate the four Balsathi domains and must not be connected to parent, worker, or child dashboards."],
    }
    (output_dir / "research_evaluation.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(render_report(result), encoding="utf-8")
    return result


def render_report(result: dict[str, Any]) -> str:
    lines = ["# Research-only childdevdata model evaluation", "", f"- Model: `{result['model_version']}`", f"- Dataset: `{result['dataset']}`", f"- Target: `{result['target']}` — {result['target_definition']}", f"- Selected by validation balanced accuracy then F1: `{result['selected_model']}`", f"- Split: {result['split']['strategy']}", "", "## Held-out test metrics", "", "| Model | Accuracy | Balanced accuracy | Precision | Recall | F1 | ROC-AUC |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for name, metrics in [("Selected", result["held_out_test_metrics"]), ("Most-frequent baseline", result["held_out_baseline_metrics"])]:
        lines.append(f"| {name} | {metrics['accuracy']:.4f} | {metrics['balanced_accuracy']:.4f} | {metrics['precision']:.4f} | {metrics['recall']:.4f} | {metrics['f1']:.4f} | {metrics.get('roc_auc', float('nan')):.4f} |")
    lines.extend(["", "## Limits", ""] + [f"- {item}" for item in result["limitations"]] + ["", "The artifact is kept in ignored `ml/private-data/research-artifacts/`; it is intentionally not served by Balsathi."])
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("ml/private-data/childdevdata-source"))
    parser.add_argument("--output", type=Path, default=Path("ml/private-data/research-artifacts"))
    parser.add_argument("--report", type=Path, default=Path("reports/research_model_evaluation.md"))
    parser.add_argument("--dataset", default="gcdg_nld_smocc")
    parser.add_argument("--target", default="ddicmm037")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(json.dumps(train(args.source, args.output, args.report, dataset=args.dataset, target=args.target, seed=args.seed), indent=2))
