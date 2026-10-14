# Production data architecture status

## Current architecture

The app remains a Next.js App Router application with same-origin Node route handlers, Prisma 6, PostgreSQL, Zod validation, and Recharts. The browser does not connect to PostgreSQL. `DATA_MODE=demo` retains the existing synthetic, process-local demo. `DATA_MODE=postgres` branches supported API operations to Prisma; database errors are returned as errors and do not fall back to the demo store.

In Postgres mode the authenticated `/api/bootstrap` response hydrates the existing reactive client store with records in the current user's child scope. Mutating form requests update through the API and refetch that scoped state. Browser storage is not used to persist the database snapshot. The storage metadata is deliberately separated from the server database.

## Persistence and API paths

The existing same-origin endpoints now use PostgreSQL in Postgres mode:

- `POST/GET /api/children`, `GET/PATCH/DELETE /api/children/{id}`: register, list, retrieve, edit, and soft archive children.
- `POST/GET/PATCH /api/observations`: create and retrieve scoped records; PATCH updates review status.
- `POST/GET /api/milestones`: append milestone assessment history and retrieve definitions/assessments.
- `POST/GET /api/growth`: append and retrieve chronological measurements.
- `POST/GET /api/reports`: generate a persisted record summary and retrieve child reports.
- `GET/PATCH /api/follow-ups`: list and resolve follow-up work.
- `GET /api/analytics`: database-derived dashboard counts, trends, milestone completion, and growth history.
- `POST/GET /api/v1/analytics/forecast`: generate or retrieve stored aggregate observation-volume predictions when an evaluated artifact is configured.
- `POST/GET /api/v1/children`, `/api/v1/children/{id}`, and child observation/milestone/growth subroutes expose versioned database endpoints.

All ordinary child record reads check the signed-in user's database scope. Parents are scoped through guardian links; workers through assignment or center scope; center administrators through their center IDs; district administrators through active records. Mutation writes and their audit event are committed in a transaction. Child creation checks center and active worker membership. Idempotency keys are supported for child and observation creation.

Observation source text is stored unchanged in `originalText`; UI summaries do not replace that source. Growth measurements append history and retain a verification status. Plausibility bounds reject impossible input; questionable but in-range entries remain marked `UNREVIEWED` for staff review.

## Schema and migration

`prisma/schema.prisma` includes the existing entities plus development assessments, follow-ups, aggregate ML predictions, idempotency records, a worker foreign key, measurement provenance/verification, and observation source/idempotency fields. `prisma/migrations/20261014000000_baseline` captures the previous schema for clean database creation. `prisma/migrations/20261014000100_production_data_architecture` adds the new schema without dropping records.

For a fresh local database:

```sh
docker compose --profile postgres up -d postgres
DATABASE_URL='postgresql://balsathi:YOUR_PASSWORD@localhost:5432/balsathi?schema=public' npx prisma migrate deploy
DATA_MODE=postgres DATABASE_URL='postgresql://balsathi:YOUR_PASSWORD@localhost:5432/balsathi?schema=public' npm run dev
```

For a pre-existing database that already has the old Prisma schema but has no migration history, first take a backup and verify that the old schema is present, then baseline it once:

```sh
npx prisma migrate resolve --applied 20261014000000_baseline
npx prisma migrate deploy
```

Do not mark the baseline applied on an empty database. The app does not automatically seed synthetic children or users into PostgreSQL. Provision real center and user accounts through a controlled administrative process before enabling Postgres login.

## Analytics definitions

- Observation trends count persisted observations grouped by UTC calendar month, with actual counts and follow-up-required counts.
- Domain analytics show observation activity counts; they are not assessment scores.
- Milestone completion is `MET / assessed applicable milestones`. `NOT_OBSERVED` is excluded. The UI and API label this as completion activity, not a clinical development score.
- Growth series include all persisted historical measurements in ascending measurement time, including records marked unreviewed.
- Empty series remain empty/null; no zero is substituted for an unrecorded assessment.
- Date filters use UTC ISO timestamps and require `from <= to`.

## Aggregate forecasting

`ml/` provides validation, feature creation, chronological holdout evaluation, baseline comparison, artifact saving, and inference for monthly aggregate observation counts only. At least 24 monthly rows are required. The candidate Random Forest is retained only if its held-out MAE beats the last-month baseline. No child-level development or risk prediction is trained. Confidence is omitted because it has not been statistically calibrated. No model was trained for this change because no historical training export or artifact was provided.

Install the optional Python dependencies with `python3 -m pip install -r ml/requirements.txt`. Export only authorized aggregate monthly counts to a CSV with `month,count` columns. Run `python3 ml/train_model.py path/to/monthly_counts.csv --output ml/artifacts`, inspect the emitted holdout metrics and saved evaluation report, and configure `ML_MODEL_PATH` only if training reports `trained: true`. The prediction API refuses to generate output when the model is unavailable or the database has fewer than 24 months.

## Limits still requiring work

- No PostgreSQL server was available in this environment, so database migration application, real database CRUD, transaction rollback, and endpoint authorization integration tests could not be executed.
- The pre-existing app has no production user/center provisioning workflow or password-reset flow. PostgreSQL login verifies stored bcrypt hashes, but administrators must provision accounts securely.
- Existing recommendation, messaging, photo upload, and chatbot routes still need PostgreSQL repository implementations before Postgres mode can support every screen end to end. They must not be treated as durable database-backed features yet.
- External database updates do not arrive by push; browser state refreshes after local API mutations and on page reload. There is no WebSocket/SSE transport.
- The database bootstrap used by the current UI is session-scoped but includes sensitive records in in-memory React state. Production deployment still needs an explicit client cache retention policy, CSP, rate limits, backups, retention/deletion policy, and security review.
- Generated reports are point-in-time summaries; regenerate them after later source-record changes.
- The model path needs Python and pinned ML dependencies in the runtime container. The current Node-only Docker image does not bundle them; the prediction route returns an inference-unavailable error if its runtime cannot execute Python.
