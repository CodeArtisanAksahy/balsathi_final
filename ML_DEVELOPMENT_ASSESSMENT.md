# Development-assessment data and ML boundary

## What is implemented

`ml/download_childdevdata.py` downloads the official `D-score/childdevdata` source into the ignored raw-data directory. `ml/profile_childdevdata.py` reads the R datasets, validates visit metadata, detects duplicates, profiles missing values and writes a pseudonymous processed assessment index plus `reports/dataset_profile.md`.

The source has item-level responses from multiple instruments. Balsathi currently records its own milestone IDs and statuses, but does not identify a source-compatible instrument or approved item mapping. Therefore no child-level ML model, risk category, diagnosis, D-score/DAZ, percentile, or four-domain prediction is enabled. This is deliberate: it avoids treating a free-text/photo/voice observation as validated assessment evidence.

The existing dashboard uses persisted milestone assessments only. Its percentage denominator is the current recorded assessment set at the relevant age checkpoint; missing observations remain missing and do not become zero.

## Reproducible commands

```sh
python3 -m pip install -r ml/requirements.txt
python3 ml/download_childdevdata.py
python3 ml/profile_childdevdata.py
python3 ml/train_childdevdata_research.py
python3 -m pytest ml/tests -q

# Existing aggregate, non-child forecast pipeline
npm run ml:export-forecast-data
npm run ml:train-forecast
```

## Preconditions for child-level inference

1. A qualified assessment owner approves a mapping from every Balsathi milestone to the source instrument/GSED item schema and rubric version.
2. Validation demonstrates that the mapping and output are appropriate for the intended Indian population and age range.
3. Evaluation is grouped by child (and preferably held out by study/site), with actual labels and a documented baseline.
4. Privacy, clinical, and governance review approve the exact data flow and human-review workflow.

Only then should a versioned model artifact and a scope-checked persistence route be added. The existing `MLPrediction` database table preserves model version and historical output metadata for that later, approved integration.

## Private inference service

The private FastAPI service exposes `GET /health`, `GET /models/status`, `GET /model/info`, and `GET /model/metrics`. The last two explicitly report that validated child-level outputs and metrics are unavailable. The existing synthetic demonstration endpoints remain disabled by default and must not be used for child decisions.

`ml/train_childdevdata_research.py` is an offline reproducibility exercise using a single documented source-instrument item and age in days. It uses group-aware child splits and publishes real held-out evaluation metrics in `reports/research_model_evaluation.md`. The artifact is deliberately ignored and cannot be served by the application.
