# childdevdata dataset profile

- Source: https://github.com/D-score/childdevdata
- Revision: `b9ba1bf4932ef6d098619eed8f28bd40470e60fa`
- Downloaded/profiled: 2026-10-30T06:39:41.163967+00:00
- Licence: CC-BY-4.0 (verify source LICENSE.md before redistribution)
- Assessment records: 28,465
- Unique children (cohort + subjid): 10,831
- Studies/cohorts: 10
- Age unit: days (agedays)
- Duplicate visit records (cohort + subjid + agedays): 0

## Dataset summaries

| Dataset | Assessments | Unique children | Columns | Milestone columns | Age range (days) | Instruments |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| gcdg_chl_1 | 2,139 | 2,139 | 113 | 106 | 180–630 | by |
| gcdg_chn | 990 | 990 | 83 | 76 | 514–670 | by |
| gcdg_col_lt42m | 1,311 | 1,311 | 627 | 620 | 173–1303 | aqi, bat, by, den, mds |
| gcdg_col_lt45m | 1,335 | 707 | 269 | 262 | 304–1370 | by |
| gcdg_ecu | 667 | 667 | 29 | 22 | 0–1065 | bar |
| gcdg_jam_lbw | 443 | 226 | 192 | 185 | 417–773 | gri |
| gcdg_jam_stunted | 477 | 159 | 290 | 283 | 277–1510 | gri |
| gcdg_mdg | 205 | 205 | 47 | 40 | 1033–1307 | mac, peg, sbi |
| gcdg_nld_smocc | 16,722 | 2,038 | 64 | 57 | 18–1014 | ddi |
| gcdg_zaf | 4,176 | 2,389 | 363 | 356 | 125–1461 | by, gri, sgr, vin |

## Data quality

- Age distribution (days): `{"count": 28153, "min": 0, "p25": 186.0, "median": 396.0, "p75": 721.0, "max": 1510}`
- Response values observed: `{"0": 289040, "1": 629667}`
- Full per-column missingness is stored in ignored `ml/private-data/processed/dataset_profile.json`.

## Model suitability

The package contains instrument-specific item responses, not four validated Balsathi domain targets. No child-level ML model, health category, risk score or four-domain prediction is trained or enabled. Missing values remain missing; they are never converted to a negative milestone result.

A D-score/DAZ research calculation may only be considered after an approved mapping from Balsathi’s recorded milestone definitions to the required GSED item schema and an independent population/generalisation review. This dataset includes no Indian cohort, so it cannot validate predictions for Balsathi users in India.

## Processing

Raw source is retained under ignored `ml/private-data/childdevdata-source`. The processed `assessment_index.csv.gz` contains pseudonymous cohort/child keys, age and item-availability counts only; it excludes Balsathi records. Re-run with `python3 ml/profile_childdevdata.py`.
