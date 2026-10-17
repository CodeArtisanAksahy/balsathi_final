# Balsathi optional tabular model service

This private FastAPI service defines and validates the three classifier contracts in `Copy_of_Untitled6 (1).ipynb`. It does not train models or create example predictions. Model files are not included in this repository, so readiness is unavailable until a compatible bundle is supplied.

## What the notebook establishes

All three datasets contain 200 generated synthetic rows. The notebook reports synthetic data as its source and does not establish field or clinical validity. Model inputs are ordered as follows:

| Task | Input features | Target | Important limit |
| --- | --- | --- | --- |
| NGO / worker follow-up | `worker_experience_years`, `days_since_last_visit`, `pending_followups`, `completed_assessments_pct` | `requires_admin_followup` (`0` / `1`) | Worker experience is not currently stored by Balsathi. Notebook held-out positive-class recall was low. |
| Parent engagement | `portal_logins_last_month`, `materials_accessed_pct`, `completed_milestone_reports` | `engagement_level` (`0` Low, `1` Medium, `2` High) | Balsathi does not track materials accessed; session rows do not establish the notebook’s portal-login semantics. Scores were weak and synthetic. |
| Child review screener | `age_months`, `motor_milestones_pct`, `cognitive_milestones_pct`, `language_milestones_pct`, `social_milestones_pct` | `warrants_professional_review` (`0` / `1`) | The notebook’s last artifact-save cell overwrites the child artifact with a `DummyClassifier` selected on the held-out test set. This service rejects dummy baselines. No child screening prediction is enabled. |

The notebook executes two model-selection flows. Its later export cell overwrites the earlier CV-selected artifacts and chooses models using the same held-out test rows it reports, which contaminates the test evaluation. The notebook outputs also report poor minority-class recall for the child target. Accordingly, the trained pipelines are marked synthetic/experimental; no accuracy, confidence, or probability is presented as real-world evidence. Child screening is disabled pending a new independently evaluated model and qualified review. The task will not diagnose a child.

No `.joblib` files or deployment manifest were attached; only the notebook was present. The existing `ml/artifacts/aggregate_observation_volume.joblib` is a separate aggregate forecasting model and is not interchangeable with these classifiers. Its Next.js forecast route and admin chart already exist and continue to use their own provenance checks.

## Start locally

From the repository root, create a private virtual environment and install the service dependencies:

```sh
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
ML_MODEL_DIR="$PWD/models" ML_ALLOW_EXPERIMENTAL=false uvicorn app.main:app --host 127.0.0.1 --port 8001
```

The API responds at `http://127.0.0.1:8001/health` and `http://127.0.0.1:8001/models/status`. Keep the process bound to loopback locally and on a private application network in deployments. No CORS origins are enabled. Never expose this service directly to the public internet.

Set `ML_SERVICE_URL=http://127.0.0.1:8001` in the Next.js server environment and restart Next.js to show readiness in **Admin → Analytics**. The app calls only the readiness endpoint today. It does not proxy classifier predictions because production Balsathi records do not provide all features with verified semantics. The parent account, worker account, center, and child scope are not used as model inputs.

To enable synthetic-only demonstration inference after reviewing the limits, start the service with `ML_ALLOW_EXPERIMENTAL=true`. This setting is ignored whenever `ENVIRONMENT=production`. Responses always include `experimental: true` and the synthetic-data limitation; no probability or confidence is returned. Do not use these outputs for operational, educational, clinical, or eligibility decisions.

## Artifact bundle contract

Place verified files in `ML_MODEL_DIR` without committing them:

```text
models/
  deployment_manifest.json
  ngo_model.joblib
  parent_model.joblib
  child_development_model.joblib
```

The manifest must declare version `1` and, for each model, the exact artifact filename, SHA-256 digest, model version, ordered feature names, exact target name, numeric fitted classes, `training_source: "synthetic_demo"`, matching `sklearn_version`, and validation metadata including `selection_method`. The loader verifies the manifest, checksum, fitted feature order, target classes, runtime sklearn version, and rejects `DummyClassifier`. The service does not accept the notebook’s loose `model_metadata.json` alone because it contains no artifact checksums or final artifact-selection trace.

Never point `ML_MODEL_DIR` at untrusted pickle/joblib files: loading them can execute code. Obtain artifacts from the model owner, verify their provenance, and keep them out of source control. The repository ignores local model bundles.

## Endpoints

- `GET /health`: process liveness only.
- `GET /models/status`: artifact readiness, schemas, and experimental status; contains no local paths.
- `POST /predict/ngo`, `/predict/parent`, `/predict/child`: strict schema validation, no identifiers, no probability output, and `503` without an explicitly enabled compatible artifact.
- `GET /api/v1/analytics/model-status`: Next.js admin-only (center or district administrator) server route to the private readiness endpoint. It never sends child or account records to the ML service.

Predictions are not persisted. Add a separately reviewed, scope-checked application route and a trustworthy feature mapping before connecting inference to child, parent, or worker views.

Run service tests from the repository root with:

```sh
python3 -m pytest ml-service/tests -q
```
