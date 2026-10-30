# Research-only childdevdata model evaluation

- Model: `childdevdata-research-age-item-v1`
- Dataset: `gcdg_nld_smocc`
- Target: `ddicmm037` — Recorded 0/1 response for a documented source-instrument milestone.
- Selected by validation balanced accuracy then F1: `logistic_regression`
- Split: GroupShuffleSplit by cohort:subjid; 60% train, 20% validation, 20% held-out test

## Held-out test metrics

| Model | Accuracy | Balanced accuracy | Precision | Recall | F1 | ROC-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Selected | 0.7093 | 0.7075 | 0.8206 | 0.7133 | 0.7632 | 0.7364 |
| Most-frequent baseline | 0.6566 | 0.5000 | 0.6566 | 1.0000 | 0.7927 | 0.5000 |

## Limits

- Research-only estimate of one documented source-instrument response from age. It is not a Balsathi child prediction, developmental diagnosis, risk flag, percentile, D-score, or clinical decision.
- The source cohort is Netherlands SMOCC; results cannot be transferred to Balsathi users or the Indian population.
- The model includes no Balsathi records, identifiers, free text, photo, voice, sex, or health data.
- It does not estimate the four Balsathi domains and must not be connected to parent, worker, or child dashboards.

The artifact is kept in ignored `ml/private-data/research-artifacts/`; it is intentionally not served by Balsathi.
