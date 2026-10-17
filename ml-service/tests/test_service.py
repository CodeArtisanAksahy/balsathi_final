from __future__ import annotations

import hashlib
import json

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.dummy import DummyClassifier
from sklearn.pipeline import Pipeline
import joblib

from app.main import app
from app.model_loader import MODEL_SPECS, ModelRegistry


def _save_bundle(directory, *, model_name="ngo", estimator=None, features=None):
    directory.mkdir(parents=True, exist_ok=True)
    spec = MODEL_SPECS[model_name]
    ordered_features = features or spec["features"]
    x = pd.DataFrame([{feature: float(i + j) for j, feature in enumerate(ordered_features)} for i in range(16)], columns=ordered_features)
    y = [0, 1] * 8
    classifier = estimator or RandomForestClassifier(n_estimators=5, random_state=7).fit(x, y)
    if not hasattr(classifier, "classes_"):
        classifier.fit(x, y)
    pipeline = Pipeline([("classifier", classifier)])
    pipeline.fit(x, y)
    artifact = directory / spec["artifact"]
    joblib.dump(pipeline, artifact)
    manifest = {
        "manifest_version": 1,
        "models": {
            model_name: {
                "artifact": spec["artifact"],
                "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
                "model_version": "unit-test-only",
                "features": ordered_features,
                "target": spec["target"],
                "classes": [int(value) for value in pipeline.classes_],
                "training_source": "synthetic_demo",
                "sklearn_version": __import__("sklearn").__version__,
                "validation": {"selection_method": "unit-test fixture"},
            }
        },
    }
    (directory / "deployment_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return manifest


def test_missing_bundle_reports_unavailable_without_fabricating_predictions(tmp_path):
    registry = ModelRegistry(tmp_path)
    status = registry.status()
    assert status["ready"] is False
    assert all(task["state"] == "unavailable" for task in status["tasks"].values())
    assert all(task["reason"] for task in status["tasks"].values())


def test_artifact_checksum_mismatch_is_not_loaded(tmp_path):
    manifest = _save_bundle(tmp_path)
    manifest["models"]["ngo"]["sha256"] = "0" * 64
    (tmp_path / "deployment_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    task = ModelRegistry(tmp_path).status()["tasks"]["ngo"]
    assert task["artifact_loaded"] is False
    assert "checksum" in task["reason"].lower()


def test_feature_order_mismatch_is_not_loaded(tmp_path):
    spec = MODEL_SPECS["ngo"]
    reversed_features = list(reversed(spec["features"]))
    _save_bundle(tmp_path, features=reversed_features)
    task = ModelRegistry(tmp_path).status()["tasks"]["ngo"]
    assert task["artifact_loaded"] is False
    assert "feature" in task["reason"].lower()


def test_dummy_baseline_is_not_loaded_as_a_predictive_model(tmp_path):
    _save_bundle(tmp_path, estimator=DummyClassifier(strategy="most_frequent"))
    task = ModelRegistry(tmp_path).status()["tasks"]["ngo"]
    assert task["artifact_loaded"] is False
    assert "dummy baseline" in task["reason"].lower()


def test_experimental_prediction_has_no_confidence_score(tmp_path):
    _save_bundle(tmp_path)
    registry = ModelRegistry(tmp_path, allow_experimental=True)
    spec = MODEL_SPECS["ngo"]
    frame = pd.DataFrame([{feature: 1.0 for feature in spec["features"]}], columns=spec["features"])
    result = registry.predict("ngo", frame)
    assert result["experimental"] is True
    assert result["training_source"] == "synthetic_demo"
    assert "not suitable" in result["limitations"]
    assert "confidence" not in result and "probability" not in result


def test_production_never_allows_experimental_inference(tmp_path):
    _save_bundle(tmp_path)
    registry = ModelRegistry(tmp_path, allow_experimental=True, production=True)
    assert registry.status()["tasks"]["ngo"]["ready"] is False


def test_api_reports_health_and_unavailable_models(monkeypatch, tmp_path):
    monkeypatch.setenv("ML_MODEL_DIR", str(tmp_path))
    monkeypatch.delenv("ML_ALLOW_EXPERIMENTAL", raising=False)
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        status = client.get("/models/status").json()
        assert status["ready"] is False
        response = client.post("/predict/ngo", json={
            "worker_experience_years": 3,
            "days_since_last_visit": 30,
            "pending_followups": 2,
            "completed_assessments_pct": 70.0,
        })
        assert response.status_code == 503
        assert "no prediction" in response.json()["detail"].lower()


@pytest.mark.parametrize(("path", "payload"), [
    ("/predict/parent", {"portal_logins_last_month": 4, "materials_accessed_pct": 52.0, "completed_milestone_reports": 2}),
    ("/predict/child", {"age_months": 24, "motor_milestones_pct": 40.0, "cognitive_milestones_pct": 50.0, "language_milestones_pct": 45.0, "social_milestones_pct": 60.0}),
])
def test_all_prediction_routes_fail_closed_when_artifacts_are_missing(monkeypatch, tmp_path, path, payload):
    monkeypatch.setenv("ML_MODEL_DIR", str(tmp_path))
    with TestClient(app) as client:
        response = client.post(path, json=payload)
        assert response.status_code == 503
        assert "no prediction" in response.json()["detail"].lower()


@pytest.mark.parametrize("payload", [
    {"worker_experience_years": -1, "days_since_last_visit": 30, "pending_followups": 2, "completed_assessments_pct": 70.0},
    {"worker_experience_years": 3, "days_since_last_visit": 30, "pending_followups": 2, "completed_assessments_pct": 70.0, "center_id": "CTR_1"},
])
def test_api_rejects_out_of_range_or_identifier_features(monkeypatch, tmp_path, payload):
    monkeypatch.setenv("ML_MODEL_DIR", str(tmp_path))
    with TestClient(app) as client:
        assert client.post("/predict/ngo", json=payload).status_code == 422
