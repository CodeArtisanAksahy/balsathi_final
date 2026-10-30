# Balsathi analytics data map

All production calculations below are scoped through `childScopeWhere` and
`requireDatabaseChildAccess`. A worker is limited to children whose
`assignedWorkerId` equals the authenticated worker; parents are limited to a
linked guardian record; center administrators are limited to their center IDs;
district administrators have the district-wide active-child scope.

| Surface / graph | Persisted source | Calculation | No-data and verification |
| --- | --- | --- | --- |
| Development Journey | `MilestoneAssessment` joined to active `MilestoneDefinition`, plus linked high `RiskAssessment` flags | Events are sorted by `assessedAt`; binary search assigns each event to its next age checkpoint; a `Map` keeps the latest milestone status. Each point is `MET / (MET + IN_PROGRESS + NEEDS_REVIEW) × 100`. | A point is `null` until a dated eligible assessment exists; no value is invented. Unit test: `src/lib/child-interpretation.test.ts`. |
| Parent Development Overview radar | Active, currently age-eligible milestone definitions and latest child milestone assessments | Per domain: latest valid status per applicable milestone; `MET / valid statuses × 100`. | Domains with no assessment are omitted from the radar and labelled “No data.” Covered by selector and component tests. |
| Child Profile Development Overview radar | Same as parent radar | Same recorded milestone achievement calculation as above. | Shows a dedicated no-data state instead of a zero polygon. Covered by `npm run typecheck` and the selector tests. |
| Parent Growth Journey | Dated milestone assessments and active definitions | At the selected earlier date and now, retain the latest assessment per milestone that was age-eligible on that date; calculate `MET / valid statuses × 100`. | A blank line point means no assessment, not 0%. |
| Parent Progress indicator / Reports progress | Active, age-eligible milestone assessments in the authorized client snapshot | Mean of non-null recorded domain percentages; each domain percentage follows the same `MET / valid statuses` rule. | If every domain is missing, display “Not enough assessments.” |
| Child Profile Growth History | `GrowthMeasurement` for the child ordered by `measuredAt` | Direct height (cm) and weight (kg) values. | Empty state if there are no rows. |
| Growth Comparison | Authorized `GrowthMeasurement` rows ordered by `measuredAt` | Direct height or weight line. BMI is exactly `weightKg / (heightCm / 100)^2`; a Theil–Sen median pairwise slope provides an outlier-resistant recorded trend when at least 3 dated measurements exist. | No growth percentiles or health labels are shown without an approved pediatric reference dataset. Unit test: `src/lib/child-interpretation.test.ts`. |
| Observation Trends area chart | Authorized `Observation` records | Counts observations and `followUpRequired` observations in each visible calendar month. | No chart if every displayed month has no observations. |
| Admin: observations by domain | Authorized `Observation` records | Count grouped by the saved `domain`. Date filters apply to `observedAt`. | Empty state if no observations. SQLite API count is compared with a direct Prisma query in `src/scripts/test-sqlite-integration.ts`. |
| Admin: risk distribution | Authorized review-required `RiskAssessment` rows and open `FollowUp` rows | Unique high-risk children; unique moderate-risk/open-follow-up children excluding high risk; remaining active children have no active flag. | “No active flag” is explicitly not a developmental assessment. Empty-scope state is shown. |
| Admin: age distribution | Authorized active `Child.dateOfBirth` | Current UTC age grouped into 0–2, 2–3, 3–4, 4–5, and 5+ years. | A group may correctly be zero; this is a count, never a substituted score. |
| Admin: worker coverage table | Active `User` workers in authorized centers; authorized active `Child.assignedWorkerId`; age-eligible `MilestoneAssessment` | Per worker: assigned child count, distinct children with ≥1 valid assessment, valid assessment records, and `assessed children / assigned children × 100`. | A worker with no assigned children gets `null` coverage (“No assigned children”), not 0%. SQLite API and direct-query comparison is in the integration script. |
| Admin: monthly observation volume | Authorized `Observation.observedAt` records | Count by UTC month; calendar gaps inside observed range are represented as an actual count of 0. | Empty state with no history. This is a factual aggregate, not a child score. |
| Admin: ML forecast overlay | Verified `MLPrediction` rows only, created from aggregate monthly observation exports | A next-month aggregate observation-volume prediction is shown only when its model artifact and holdout evaluation checksum validate. It is drawn separately from historical actuals. | No individual prediction, ability score, or invented uncertainty interval is displayed. The API rejects an invalid/unavailable model. |

## Refresh and report behavior

Every successful SQLite mutation refreshes the authorized `/api/bootstrap`
snapshot and dispatches `balsathi:records-updated`. Dashboards, child growth,
and reports listen for that event and also use visible-tab polling as a
fallback. Report generation queries the authorized child’s current records at
the time the report is created; stored reports remain an auditable snapshot.

## Test commands

```sh
npm run typecheck
npm run test
npm run lint
npm run test:sqlite-integration
```

The SQLite integration test uses a temporary, empty, dedicated `test.db`; it
creates records through running API endpoints, then compares analytics API
values to direct database queries and removes every fixture afterward.
