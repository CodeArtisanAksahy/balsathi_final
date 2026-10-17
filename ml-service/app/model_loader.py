from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any

import joblib
import sklearn


MODEL_SPECS: dict[str, dict[str, Any]] = {
    "ngo": {
        "artifact": "ngo_model.joblib",
        "features": ["worker_experience_years", "days_since_last_visit", "pending_followups", "completed_assessments_pct"],
        "target": "requires_admin_followup",
        "labels": {0: "No synthetic follow-up flag", 1: "Synthetic admin follow-up flag"},
    },
    "parent": {
        "artifact": "parent_model.joblib",
        "features": ["portal_logins_last_month", "materials_accessed_pct", "completed_milestone_reports"],
        "target": "engagement_level",
        "labels": {0: "Low (synthetic label)", 1: "Medium (synthetic label)", 2: "High (synthetic label)"},
    },
    "child": {
        "artifact": "child_development_model.joblib",
        "features": ["age_months", "motor_milestones_pct", "cognitive_milestones_pct", "language_milestones_pct", "social_milestones_pct"],
        "target": "warrants_professional_review",
        "labels": {0: "No synthetic model flag; this does not rule out concerns", 1: "Synthetic flag for qualified human review"},
    },
}

SYNTHETIC_LIMITATIONS = (
    "Experimental demonstration only. Trained on notebook-generated synthetic rows; "
    "not field-validated and not suitable for operational decisions or diagnosis."
)


class ModelRegistry:
    """Loads each validated pipeline once and reports readiness without exposing paths."""

    def __init__(self, model_dir: Path, *, allow_experimental: bool = False, production: bool = False):
        self.model_dir = model_dir
        self.allow_experimental = allow_experimental and not production
        self.models: dict[str, dict[str, Any]] = {}
        self.errors: dict[str, str] = {}
        self._load_all()

    def _load_all(self) -> None:
        manifest_path = self.model_dir / "deployment_manifest.json"
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            self.errors = {name: "Model artifact package is not installed." for name in MODEL_SPECS}
            return
        except (OSError, json.JSONDecodeError):
            self.errors = {name: "Model deployment manifest is missing or invalid." for name in MODEL_SPECS}
            return

        if manifest.get("manifest_version") != 1 or not isinstance(manifest.get("models"), dict):
            self.errors = {name: "Unsupported model deployment manifest." for name in MODEL_SPECS}
            return

        for name, spec in MODEL_SPECS.items():
            try:
                entry = manifest["models"].get(name)
                if not isinstance(entry, dict):
                    raise ValueError("Model metadata is missing.")
                if entry.get("artifact") != spec["artifact"]:
                    raise ValueError("Artifact name does not match the supported model task.")
                if entry.get("features") != spec["features"]:
                    raise ValueError("Feature names or feature order do not match the supported input schema.")
                if entry.get("target") != spec["target"]:
                    raise ValueError("Target label does not match the notebook training target.")
                if entry.get("training_source") != "synthetic_demo":
                    raise ValueError("Training provenance is not verified for this integration.")
                if entry.get("sklearn_version") != sklearn.__version__:
                    raise ValueError("Artifact scikit-learn version does not match the installed runtime.")
                version = entry.get("model_version")
                digest = entry.get("sha256")
                validation = entry.get("validation")
                if not isinstance(version, str) or not version.strip():
                    raise ValueError("Model version is missing.")
                if not isinstance(digest, str) or len(digest) != 64:
                    raise ValueError("Artifact checksum is missing or invalid.")
                if not isinstance(validation, dict) or not validation.get("selection_method"):
                    raise ValueError("Validation and model-selection metadata are required.")
                artifact_path = self.model_dir / spec["artifact"]
                if not artifact_path.is_file():
                    raise ValueError("Model artifact file is missing.")
                artifact_digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
                if artifact_digest != digest:
                    raise ValueError("Model artifact checksum does not match its manifest.")
                pipeline = joblib.load(artifact_path)
                if not callable(getattr(pipeline, "predict", None)):
                    raise ValueError("Artifact does not expose a prediction pipeline.")
                fitted_features = getattr(pipeline, "feature_names_in_", None)
                if fitted_features is None or list(fitted_features) != spec["features"]:
                    raise ValueError("Fitted pipeline features do not match the supported feature order.")
                classifier = getattr(pipeline, "named_steps", {}).get("classifier")
                if classifier is None or classifier.__class__.__name__ == "DummyClassifier":
                    raise ValueError("Dummy baseline artifacts are not enabled as predictive models.")
                classes = getattr(pipeline, "classes_", None)
                expected_classes = entry.get("classes")
                if classes is None or list(classes) != expected_classes:
                    raise ValueError("Fitted target classes do not match the manifest.")
                self.models[name] = {"pipeline": pipeline, "metadata": entry, "spec": spec}
            except Exception as exc:  # status is intentionally concise; no paths or artifact contents
                self.errors[name] = str(exc) if isinstance(exc, ValueError) else "Model artifact could not be loaded."

    def status(self) -> dict[str, Any]:
        tasks: dict[str, Any] = {}
        for name, spec in MODEL_SPECS.items():
            loaded = name in self.models
            experimental_enabled = loaded and self.allow_experimental
            tasks[name] = {
                "ready": experimental_enabled,
                "artifact_loaded": loaded,
                "state": "experimental" if experimental_enabled else "disabled_experimental" if loaded else "unavailable",
                "model_version": self.models[name]["metadata"]["model_version"] if loaded else None,
                "target": spec["target"],
                "features": spec["features"],
                "training_source": "synthetic_demo",
                "limitations": SYNTHETIC_LIMITATIONS,
                "reason": None if experimental_enabled else self.errors.get(name, "Experimental inference is disabled; enable only in a non-production demo environment."),
            }
        return {"service": "balsathi-tabular-models", "ready": any(row["ready"] for row in tasks.values()), "experimental_only": True, "tasks": tasks}

    def predict(self, name: str, frame: Any) -> dict[str, Any]:
        if name not in MODEL_SPECS:
            raise KeyError(name)
        if name not in self.models:
            raise RuntimeError(self.errors.get(name, "Model artifact is unavailable."))
        if not self.allow_experimental:
            raise PermissionError("Experimental inference is disabled. No prediction was generated.")
        loaded = self.models[name]
        prediction = int(loaded["pipeline"].predict(frame)[0])
        labels = loaded["spec"]["labels"]
        if prediction not in labels:
            raise ValueError("Model returned a target class outside the verified schema.")
        return {
            "model_id": name,
            "model_version": loaded["metadata"]["model_version"],
            "target": loaded["spec"]["target"],
            "prediction": prediction,
            "label": labels[prediction],
            "experimental": True,
            "training_source": "synthetic_demo",
            "limitations": SYNTHETIC_LIMITATIONS,
        }
