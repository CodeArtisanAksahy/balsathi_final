# Data architecture and SQLite migration status

## Current architecture

The application is a Next.js App Router project with Node route handlers, Prisma 6, SQLite, Zod validation, and Recharts. The browser does not connect directly to SQLite. `DATA_MODE=demo` retains the synthetic process-local demo. `DATA_MODE=sqlite` uses Prisma and returns database errors without falling back to demo records.

SQLite mode hydrates the authenticated `/api/bootstrap` response with the current user's scoped records. Mutations write through API handlers and refresh the scoped client state. SQLite is a single-file local store; use one application instance with persistent local storage.

## PostgreSQL to SQLite transition

The active Prisma datasource and migration history now target SQLite. PostgreSQL migration SQL was moved without edits to `prisma/postgresql-migrations-legacy/`. This preserves the previous migration files for reference; Prisma does not apply them in SQLite mode.

Changing `.env` to `DATA_MODE=sqlite` and `DATABASE_URL="file:./dev.db"` creates or uses `prisma/dev.db`. **It does not copy PostgreSQL records.** The local PostgreSQL database remains a separate data source and should be backed up before any retirement or manual data export. Do not infer record migration from successful SQLite startup.

For a fresh local SQLite database:

```sh
npm run db:generate
npm run db:migrate:deploy
DATA_MODE=sqlite DATABASE_URL='file:./dev.db' npm run dev
```

`prisma/seed.ts` seeds milestone definitions only. User/center/child account provisioning is not included. Back up the SQLite file while the app is stopped for simple local copies; production deployments need a SQLite-aware backup mechanism and tested restore procedure.

## Database-backed API paths

The SQLite adapter supports these core operations:

- `POST/GET /api/children`, `GET/PATCH/DELETE /api/children/{id}`: child creation, scoped reads, edits, and archive.
- `POST/GET/PATCH /api/observations`: scoped observation create/list/review updates.
- `POST/GET /api/milestones`: milestone assessment writes and reads.
- `POST/GET /api/growth`: measurements and history.
- `POST/GET /api/reports`: record summaries and child reports.
- `GET/PATCH /api/follow-ups`: follow-up listing and resolution.
- `GET /api/analytics` and `GET /api/v1/analytics/dashboard`: database-derived analytics.
- `POST/GET /api/v1/analytics/forecast`: explicit forecast generation and aggregate history retrieval.
- `/api/v1/children` and child observation/milestone/growth subroutes: versioned child APIs.

Parents are scoped through guardian links; workers by assignment or center; center administrators by assigned centers; district administrators by active records. Mutations and audit events use transactions. Unsupported subsystems may remain demo-only and must not be treated as durable SQLite features.

## Schema notes

The active schema is `prisma/schema.prisma`; its first SQLite migration is `prisma/migrations/20261015000000_init_sqlite/migration.sql`. SQLite stores domain enum values as strings and structured lists/objects as JSON. Application validation enforces supported values and relationships. Do not manually mix the legacy PostgreSQL migrations into the SQLite migration directory.

## Analytics and aggregate forecasting

Observation trends count persisted observations grouped by UTC calendar month. Missing calendar months in the forecast series are represented with zero counts. Forecast history returns aggregate monthly totals only; no child identifiers are included.

`ml/` provides validation, feature creation, chronological holdout evaluation, baseline comparison, artifact saving, and inference for monthly aggregate observation counts. At least 24 consecutive calendar months are required. Month gaps must be explicit in aggregate exports. Candidate Random Forest artifacts are retained only if held-out MAE beats the last-month baseline. The holdout is chronological (last 20%, at least 3 months) and uses lag-only features. Metadata records training cutoff, data source, sample counts, date ranges, MAE, and RMSE. No child-level model is trained and no uncertainty interval is claimed.

Export SQLite aggregates without child identifiers:

```sh
DATA_MODE=sqlite npm run ml:export-forecast-data
```

The exporter writes a restricted aggregate CSV and checksum manifest under `ML_EXPORT_DIR`. Train with the existing pipeline only when the validated real dataset meets its history requirements:

```sh
python3 ml/train_model.py <exported-csv> --data-source database --output <private-artifact-directory>
```

Configure `ML_MODEL_PATH` and `ML_EVALUATION_PATH` to the accepted artifact and evaluation report. The API rejects unsupported provenance, missing artifacts, invalid evaluation metadata, and insufficient history; it does not fabricate predictions. POST is the explicit forecast-generation action. Saving new observations refreshes historical counts but does not generate a forecast automatically.

`npm run test:sqlite-integration` exercises a dedicated, empty SQLite file and requires `ALLOW_SQLITE_INTEGRATION_FIXTURES=true`. To test a running app, configure `TEST_API_BASE_URL`; test users and records are temporary and are cleaned up. The runner refuses a database not clearly named for testing or containing existing center/user/child/observation records.

## Verification evidence and limits

The SQLite integration path verifies migration application, authentication/session scope reload, center and parent authorization boundaries, persisted observation creation/readback, idempotent retry, stale update rejection, input validation, readiness, and forecast failure without accepted evaluation metadata. This is a local test-fixture integration, not real-world data validation.

The existing PostgreSQL database is not queried or migrated by the SQLite workflow. No real-data training, artifact acceptance, or real predictive accuracy is claimed. Actual historical record counts depend on the separate PostgreSQL data source and any separately performed migration/export.

## Remaining work

- No production provisioning, password reset, or durable session revocation flow.
- Some messaging, uploads, recommendations, and chatbot data paths do not have complete SQLite persistence.
- SQLite needs a single writer/application instance and a persistent local volume; no multi-replica storage or coordination is provided.
- Backups, restore drills, retention/deletion, external database migration, operational metrics, and security/privacy review need explicit procedures.
- Forecast generation requires a separately trained, accepted, correctly configured model artifact and evaluation metadata; no accepted production model is included.
