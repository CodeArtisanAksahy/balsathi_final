# Balsathi AI — Audit and Fix Report

**Audit date:** 16 October 2026
**Scope:** repository documentation, build/start configuration, authentication and authorization paths, dashboard/API behavior, uploads, offline queue, selected PostgreSQL/forecast code, dependency configuration, and available automated checks.

> **Latest status — critical features implementation, 16 October 2026:** SQLite remains active and existing database files were not reset. This phase added authorized center/account provisioning, durable session revocation, persistent single-host login rate limiting, model readiness validation, workflow regression coverage, and standalone relative SQLite path resolution. See the final dated section for exact results and limitations. Earlier status entries below are historical and have been superseded where they conflict with newer updates.

## Executive summary

**Current configuration:** SQLite is the active persistence mode. Authorized account/center provisioning for district and center administrators, workers, and linked parent accounts is implemented; durable revocation, single-host persistent login throttling, and model readiness checks are also implemented. Unit, API integration, E2E smoke, ML tests, typecheck, lint, and production build pass. This does not establish production readiness: first district administrator bootstrap is controlled/out of band, password reset/email, media transcription, durable offline sync, multi-instance rate limiting, valid real-history forecasting, production backup operations, and container startup remain incomplete or infrastructure-dependent. Earlier phases below are historical and are superseded by newer status sections.

The local PostgreSQL database was previously inspected read-only: core `Center`, `User`, `Child`, and `Observation` tables had zero rows. This audit made no PostgreSQL writes and used only an isolated ignored SQLite test database for temporary fixtures. No real-data model artifact was trained or accepted, and no real-world predictive accuracy is claimed.

## Confirmed findings and changes

| Severity | Finding | Change | Verification |
| --- | --- | --- | --- |
| High | Forecast endpoints checked `DATA_MODE` before authentication, disclosing route configuration to unauthenticated callers. | Authenticate and check role before mode/configuration checks. | Playwright request test expects 401 without a session. |
| High | PostgreSQL JWT role/center claims remained trusted until token expiry, even if the account was disabled or scope changed. | PostgreSQL session resolution reloads the active user and current role, language, and center IDs on each request. | Typecheck/build pass; live DB session revocation/scope change integration remains unverified. |
| High | Upload paths incorporated user filenames and accepted arbitrary MIME types, then served them from the app origin. | Enforce a 10 MiB limit and MIME/type matching, use UUID storage keys with fixed extensions, and add `nosniff`, sandbox CSP, and `private, no-store` on downloads. Missing stored files now return 404. | Typecheck/build pass; no live S3/upload malware integration test was available. |
| High | Docker used `COPY . .` without `.dockerignore`; generated standalone output in this checkout included `.env`. | Added `.dockerignore` to exclude local environment files, credentials, uploads, and test output. | Confirmed prior standalone output contained `.env`; Docker image build was not available to validate corrected image. |
| High | Offline queue used random simulated outcomes and could mark unsent items `SYNCED`. | Removed simulated sync. Pending items become `FAILED` with an explicit recovery message; UI says automatic upload is unavailable. | Regression test proves queue items never become synced without a server implementation. |
| Medium | PostgreSQL login page showed demo mode and quick-login credentials. | Login reflects configured mode and hides demo shortcuts/password outside demo mode. | Playwright smoke checks PostgreSQL-mode presentation when applicable. |
| Medium | Admin system-health page displayed invented uptime, request counts, users, latency, and healthy status. | Removed invented metrics; refresh probes `/api/health` and identifies it as liveness only. Other services show “not measured” or unavailable. | Build and page smoke pass. |
| Medium | Locale change minted a separate 12-hour token with a direct secret fallback, ignoring configured lifetime and production secret validation; errors mapped as generic server errors. | Locale changes use the shared session helper and typed 401/400 errors. | Typecheck/build pass; live database update not available. |
| Medium | `npm start` ran `next start` despite `output: standalone`; Next.js warned this was unsupported. | Added a standalone launcher that copies public/static assets and starts `.next/standalone/server.js`; updated the start script. | Production start and HTTP/static-asset smoke checks returned 200. |
| Medium | README and security notes presented stale/inconsistent architecture and verification claims. | Updated both to describe partial PostgreSQL support, demo-only offline queue, and auth configuration. | Documentation reviewed against current source. |
| Medium | Prisma config dependency resolved vulnerable `deepmerge-ts` 7.x; Vitest/tinypool also had advisories. | Added `deepmerge-ts` 8.x override and updated Vitest to 4.1.11. | Prisma validation, unit suites, build, and production dependency audit pass. |

## Architecture and workflow observations

- Demo mode is the default. Demo identity selection is not real authentication; its records are synthetic/in-memory.
- PostgreSQL mode supports selected routes; messaging, uploads, chat, transcription, recommendation workflows, and provisioning are not complete end to end.
- The app shell waits for PostgreSQL bootstrap before rendering the main application, avoiding a visible demo-fixture flash in that shell. The browser store still has demo fallback initialization code; it is not authoritative or durable PostgreSQL state.
- The offline page does not enqueue observation saves and does not upload queue entries. It is not an offline capture/synchronization feature; do not rely on it to preserve records.
- `/api/health` is liveness only. It does not establish database readiness, authentication readiness, or model availability.
- Forecast integration requires PostgreSQL mode, an API URL, and a provisioned admin account. It was not run against a live database; the configured PostgreSQL TCP endpoint was unreachable, and no provisioned integration admin/API URL was available.
- PostgreSQL JWTs are checked against the active database user, but sessions remain stateless; stolen tokens cannot be individually revoked until expiry. The login UI’s “Forgot password?” control is still nonfunctional.
- `npm audit fix --force` suggests downgrading `eslint-config-next` to Next 14.2.35. That incompatible downgrade was not applied. Remaining full-tree advisories are in the Next ESLint development dependency chain. Production dependency audit is clean.
- Prisma warns `package.json#prisma` configuration is deprecated and should move to `prisma.config.ts` before Prisma 7.
- Lint succeeds with 63 warnings and no errors. Most are existing unused imports/variables; one is the existing raw `<img>` warning.

## Verification results

| Check | Result |
| --- | --- |
| `npm test` | PASS — 11 Node tests and 14 Vitest tests; 25 total, 0 failed. |
| `npm run test:e2e` | PASS — 2 Playwright smoke tests. |
| `python3 -m pytest -q` | PASS — 68 passed, 2 skipped. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS with 63 warnings, 0 errors. |
| `npm run db:validate` | PASS; Prisma reports schema valid. This is not a database connection test. |
| `npm run build` | PASS — Next.js production build completed. |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 production dependency vulnerabilities after the override. |
| `npm audit` | 5 high-severity findings remain in the Next ESLint development dependency chain; the suggested automatic fix downgrades Next 16 to Next 14. |
| `npm run start` smoke | PASS — production server, login page, health endpoint, and static asset returned HTTP 200. |
| `npm run test:forecast-integration` | NOT RUN — requires `DATA_MODE=postgres`, reachable migrated database, `TEST_FORECAST_API_BASE_URL`, and a provisioned admin. |
| PostgreSQL migration/CRUD/authz integration | NOT RUN — the configured PostgreSQL TCP endpoint was unreachable; no provisioned users were available. |
| Real ML training and accuracy evaluation | NOT RUN — no accessible real history or validated export; no real-data metrics or artifact are claimed. |

## Remaining work before production use

1. Provision PostgreSQL and run migrations plus authenticated role/tenant, CRUD, forecast, and rollback integration tests.
2. Implement or explicitly disable unsupported PostgreSQL workflows and remove stale demo-only navigation for production users.
3. Build offline capture and idempotent server sync before representing queued items as recoverable records.
4. Add durable session revocation, rate limits, request-origin/CSRF policy, secure provisioning, and password reset.
5. Add live readiness/telemetry checks, backups, retention/deletion controls, and independent security/privacy review.
6. Resolve compatible ESLint dependency advisories without downgrading the framework; migrate Prisma configuration before Prisma 7.
7. Train/evaluate the aggregate model only after validated real monthly history is available. Keep it unavailable when history or artifact criteria are unmet.


## Phase 2 update — 15 October 2026

### Database configuration and live verification

- Updated the ignored local `.env` to `DATA_MODE=postgres` and the user-specified local database target (`balsathi_ai`). Existing app/auth settings were preserved. No connection string or secret was added to tracked files.
- PostgreSQL at localhost accepted connections as `akshaythakur`. Before writes, the target database reported zero public tables and zero centers, users, children, or observations. The two checked-in Prisma migrations were applied with `npm run db:migrate:deploy`; `npx prisma migrate status` then reported the schema up to date.
- Added `npm run test:postgres-integration`. The explicit fixture mode refuses production, requires an explicit opt-in, only permits a clearly named test database, and refuses any database containing centers/users/children/observations. It created temporary fixtures and verified PostgreSQL login/session, role change and account disablement against an existing cookie, center-admin/worker/parent authorization, child profile retrieval, observation creation/readback, duplicate idempotency, stale update conflict, invalid request rejection, readiness, and forecast failure handling. The suite passed; a follow-up SQL check verified all fixture records were removed and the database returned to zero data rows in those core tables.
- No real users or real observations were found. The database contains 0 observation months. No real-data model training or model artifact creation was possible, and no MAE/RMSE claim is made.
- An existing ignored `ML_MODEL_PATH` target is present but does not have matching verified PostgreSQL evaluation metadata. POST forecast returned `MODEL_EVALUATION_INVALID` (503) and wrote no prediction. This is an honest rejection, not a successful inference.

### Changes made in Phase 2

- Added `/api/health/ready`, separate from liveness. It checks PostgreSQL with a short timeout and reports model file availability independently; the public response contains only dependency state.
- Added login rate limiting and same-origin checks to cookie-authenticated locale/logout mutations. The limit is process-local and is not a distributed control for multi-instance deployment.
- Fixed PostgreSQL session resolution to branch from the current `config.dataMode`, avoiding a potentially stale module-level mode helper.
- Routed child profile edits through a service that applies current role/center scope, checks `If-Match`, and commits the update and audit event together.
- Corrected the help page’s offline claim: automatic capture and sync are unavailable. Existing queue behavior continues to avoid reporting unconfirmed records as synced.
- Added request-security unit tests and a real PostgreSQL/API integration script with fixture and read-only modes.

### Phase 2 verification

| Check | Outcome |
| --- | --- |
| `npm run db:migrate:deploy` | PASS — both migrations applied to initially empty `balsathi_ai`. |
| `npx prisma migrate status` | PASS — schema up to date. |
| `npm run test:postgres-integration` with explicit temporary-fixture opt-in and local app | PASS — login/session, permission boundaries, role/scope refresh, deactivation, child read, observation create/readback, duplicate retry, version conflict, invalid input, readiness, and safe forecast rejection. Fixtures removed and verified absent. |
| `npm test` | PASS — 11 Node tests and 16 Vitest tests (27 total), including same-origin and rate-limit checks. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS — 63 warnings, 0 errors. Warnings are existing unused imports/variables and one existing image optimization warning. |
| `npm run test:e2e` | PASS — 2 Playwright smoke tests after stopping the temporary integration server. |
| `npm run db:validate` | PASS — Prisma schema valid. Prisma still warns that `package.json#prisma` configuration is deprecated. |
| `npm run build` | PASS — Next.js production build completed, including readiness route. |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 production vulnerabilities. |
| `npm audit --audit-level=high` | FAIL — 5 high-severity issues remain in the Next ESLint development dependency chain; suggested forced fix downgrades framework config to Next 14 and was not applied. |

### Remaining limitations

- The database is intentionally empty after tests; production login/core workflows still require controlled provisioning of real users, centers, and milestone definitions.
- Read-only forecast verification against a provisioned real-data tenant was not run. No historical data, accepted real-data artifact, or prediction persistence path with a trained model was available. The current artifact is rejected for invalid evaluation provenance.
- Offline capture/sync remains unavailable and is described as unavailable in the UI/help. Password reset, durable server-side session revocation, distributed rate limiting, broad per-route CSRF/origin coverage, backups, telemetry, and retention/deletion operations still need production implementations.
- Full PostgreSQL persistence remains partial for unsupported chat, upload, transcription, and related workflows; those API routes return explicit unavailable errors where implemented.
- Prisma configuration migration and compatible remediation of the development dependency advisories remain outstanding.

### Exact next steps

1. Provision a real PostgreSQL admin, center, workers, parent links, and milestone definitions through a controlled process; do not seed demo fixtures.
2. Run the read-only integration mode with `TEST_API_BASE_URL` and `TEST_FORECAST_ADMIN_USER_ID` against that deployment. Confirm readiness, scoped dashboard, login, child CRUD/observation workflows, and database-backed reports.
3. Only after at least 24 consecutive validated real observation months exist, export aggregate counts, train/evaluate chronologically against the naive baseline, and configure the artifact plus evaluation metadata.
4. Implement distributed login/sensitive-route rate limits, durable session revocation, complete origin policy, and password reset only when email delivery infrastructure is configured.
5. Implement secure offline storage and idempotent server synchronization before re-enabling offline capture.
6. Resolve ESLint dependency advisories without framework downgrade and migrate Prisma config before Prisma 7.


## PostgreSQL environment setup update — 15 October 2026

### Environment discovered

- macOS 15.7.4, Apple Silicon `arm64`; user `akshaythakur`; shell `/bin/zsh`.
- Homebrew 7.0.9 is installed at `/opt/homebrew/bin/brew`.
- Homebrew `postgresql@16` is installed; PostgreSQL client/server utilities report 16.15.
- `postgresql@16` Homebrew service is already `started`; `pg_isready -h localhost -p 5432` reports accepting connections.
- Node.js v25.6.0 and npm 11.9.0 are available. (The app declares Node >=20.19.)
- The project uses Prisma 6 with `DATABASE_URL`; no `DIRECT_URL` or `prisma.config.ts` is currently used.

### Database and environment status

- Local role `akshaythakur` connects successfully to PostgreSQL. The `balsathi_ai` database already exists and is accessible; no role/database/service installation or global authentication change was required.
- `.env` has `DATA_MODE`, `DATABASE_URL`, `APP_ORIGIN`, `AUTH_SECRET`, and `ML_MODEL_PATH` configured; no `DIRECT_URL` or live forecast-test admin/base URL is configured. Only variable names were inspected.
- `git check-ignore .env` confirms `.env` is ignored.
- The actual connection was verified through Prisma using its `.env` loading: current database `balsathi_ai`, current user `akshaythakur`, PostgreSQL 16.15.
- `psql "$DATABASE_URL"` from the shell did not work because `.env` values are not exported into the shell. `psql` therefore defaulted to database `akshaythakur` and returned “database does not exist.” This does not indicate an app connectivity failure; Prisma and the running app connected successfully.
- `npx prisma migrate status` reports 2 migrations found and the schema up to date. `npm run db:validate` and `npm run typecheck` pass.

### App integration verification

- Started the app in PostgreSQL mode on a temporary local port. `/api/health` returned 200 with mode `postgres`; `/api/health/ready` returned 200 with database `ready`; unauthenticated forecast GET returned 401.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3021 npm run test:e2e`: PASS, 2/2. This included the PostgreSQL-mode login page and GET/POST forecast unauthorized checks.
- No provisioned application users, centers, children, or observations were available for authenticated workflow verification. The prior fixture integration harness deliberately refuses non-empty databases, so it was not rerun against this existing database. No user/child data was changed in this phase.
- The ignored configured model path is reachable, but readiness only reports file presence. It does not prove provenance/evaluation validity; previous authenticated fixture testing showed the forecast route rejects the current evaluation metadata. No real model training, authenticated forecast, or real-data accuracy is claimed.

### Files changed for this environment check

Only `AUDIT_AND_FIX_REPORT.md` was updated. No PostgreSQL software, service configuration, global shell PATH, database role, database, `.env`, or real data was changed. Existing untracked `desktop/` remains untouched.

### Remaining exact actions

1. Provision a real app admin and center/worker records through the project’s controlled provisioning process; do not seed demo data into PostgreSQL.
2. Configure `TEST_API_BASE_URL` and `TEST_FORECAST_ADMIN_USER_ID` in the ignored local environment when a suitable test admin exists, then run the read-only integration mode of `npm run test:postgres-integration`.
3. For a direct `psql` shell check, safely export only for the command with an environment-file-aware tool, or run `node --env-file=.env` with Prisma as done above. Do not paste credentials into terminal history.
4. Keep PostgreSQL 16 service and existing data directory unchanged; no install/start step is needed on this Mac.

## PostgreSQL to SQLite migration — 15 October 2026

### Migration decisions

- Changed the active Prisma connector to SQLite and created `prisma/migrations/20261015000000_init_sqlite/migration.sql`. Moved the original PostgreSQL migrations without editing them into `prisma/postgresql-migrations-legacy/` and set the active migration provider to `sqlite`.
- Changed local `.env` to `DATA_MODE=sqlite` and `DATABASE_URL="file:./dev.db"`; `.env` remains ignored. Added database-file patterns to `.gitignore`, and did not stage either `prisma/dev.db` or the temporary `prisma/test.db`.
- Changed the service module and Prisma-backed routes to database-neutral naming, removed PostgreSQL-only filtering/raw aggregation, and used Prisma queries for monthly counts and JSON scope handling. SQLite stores enum-like values as strings and structured lists as JSON; route validation continues to enforce domain values.
- Removed the stale `db:seed` package configuration because its referenced `prisma/seed.ts` does not exist; no synthetic user or child seed data was introduced.
- Updated docs, `.env.example`, SQLite integration test instructions, and Docker Compose to use a local SQLite file and persistent volume. No automatic PostgreSQL record migration was needed for core app tables: read-only checks found zero rows in `Center`, `User`, `Child`, and `Observation`. The PostgreSQL database, service, and legacy migrations remain intact.
- Offline browser queue behavior remains separate from server-side SQLite persistence. No ML artifact was retrained or accepted; the API rejects the existing artifact/evaluation provenance and does not fabricate forecasts.

### Verification performed

| Check | Result |
| --- | --- |
| `npx prisma migrate deploy` against `file:./test.db` | PASS — one SQLite migration applied. Plain invocation first returned a blank Prisma schema-engine error; retry with `RUST_LOG=trace` succeeded. |
| `npx prisma migrate status` against `prisma/dev.db` | PASS — schema is up to date. |
| `npm run db:validate` | PASS — SQLite Prisma schema valid. |
| `npm run typecheck` | PASS. |
| `npm test` | PASS — 11 Node tests and 16 Vitest tests. |
| `npm run test:sqlite-integration` against an isolated empty `prisma/test.db` and running local API | PASS — login/session refresh, account role/disable change, unauthorized request, center/parent scoping, persisted observation create/readback, idempotent retry, stale update rejection, invalid input rejection, readiness, and no prediction on rejected artifact. Temporary fixtures were cleaned. |
| `python3 -m pytest -q ml/tests` | PASS — 68 passed, 2 skipped. |
| `npm run lint` | PASS — 0 errors, 63 warnings (unused symbols). |
| `npm run build` | PASS — Next.js production build completed. |
| `npm run test:e2e` | PASS — 2/2 Playwright smoke checks passed in SQLite mode. |
| Existing PostgreSQL data check | PASS/read-only — PostgreSQL 16 remained accepting connections; 21 public tables exist; `Center`, `User`, `Child`, and `Observation` each contain 0 rows. No PostgreSQL writes were performed in this migration phase. |
| `docker build -t balsathi-ai-sqlite:verify .` | BLOCKED — Docker CLI is installed, but its daemon is not running. The image startup/migration path was not verified in a built container. |

### Remaining limitations

- The database integration harness verifies API persistence from a separate Node test process while the app is running. A full packaged Docker image startup, explicit stop/restart persistence scenario, and restore drill were not run.
- User/center provisioning is not implemented. The old seed entry referenced a missing script and was removed rather than introducing unrequested synthetic records.
- Some messaging, uploads, recommendations, chatbot data, and other screens are not fully persisted through SQLite. SQLite requires a single app instance with persistent local disk.
- 63 lint warnings remain; they are warnings for unused symbols, with no lint errors.
- PostgreSQL core-table counts were empty, but no general-purpose record migration/import tool was added. If other PostgreSQL tables contain records that must be preserved, export/import and reconciliation must be scoped separately before retiring that database.
- No real-data model artifact was trained or verified. No real predictive accuracy claim is made.

## Comprehensive remaining-issues audit — 15 October 2026

### Feature inventory and current status

| Feature/workflow | Status | Evidence and boundary |
| --- | --- | --- |
| SQLite persistence and schema | Working and verified | Active datasource is SQLite; `prisma migrate status` reports up to date; isolated integration used `prisma/test.db`; no development DB reset or user-data deletion was performed. |
| Authentication, logout, disabled accounts, role/scope refresh | Working and verified for current SQLite routes | Integration exercised login, logout, expired JWT, disabled account, changed role, and changed center scope. Sessions are still JWT-based and lack individual durable revocation. |
| Authorization and child/center/parent isolation | Working and verified for tested routes | Integration verified center separation and parent guardian-link scope. This is route-level coverage, not a formal audit of every route/data combination. |
| Request origin protection | Partially implemented | JSON writes, multipart upload/transcription, locale/logout, and forecast POST enforce same-origin; missing origin is rejected. This is not a substitute for a deployment-wide CSRF strategy across every future mutation. |
| Child registration/profile updates | Partially implemented | SQLite route integration covers scoped reads and rejects invalid input; calendar dates now reject impossible dates, and future DOB updates are rejected. Provisioning of users/centers is not implemented. |
| Text observation capture/history | Working and verified for core SQLite API flow | Integration persists an observation, reads it back, retries with the same idempotency key, and rejects stale update versions. |
| Milestones and growth records | Partially implemented | SQLite routes persist these records; date checks now reject impossible/future or pre-birth timestamps on affected paths. Broader UI workflow/clinician validation has not been independently E2E-tested. |
| Follow-up and dashboard analytics | Partially implemented | SQLite bootstrap includes scoped open follow-ups, and dashboard API uses scoped database counts rather than synthetic zeroes. Manual dashboard rendering against a live browser/API session was not separately tested. |
| Forecast API and ML | Safe failure verified; real inference unavailable | Integration confirms unauthorized access and rejected invalid model evaluation metadata (503); there is no accepted real-data artifact, so no prediction is fabricated. No real data/month counts or MAE/RMSE evaluation is available. |
| Admin analytics dashboard | Partially implemented | Forecast UI uses forecast API data, labels actual history separately, and exposes loading/empty/error/metadata states; full authenticated browser integration with a valid model is blocked by the missing accepted artifact. |
| Messaging/recommendations/reports | Partially implemented | SQLite-backed routes/services exist for selected operations; broad role-by-role UI-to-database coverage was not run. Some AI/recommendation outputs are deterministic/rule-based or unavailable depending on configured services. |
| Photo upload and voice transcription | Unavailable in SQLite mode; UI clarified | Upload/transcribe APIs explicitly reject unsupported SQLite operation. Photo page now advertises unavailability; voice page allows notes-only observation and clearly disables the implied recording/transcription availability. S3/STT integration was not tested. |
| Offline capture and sync | Unavailable; misleading statuses fixed | Queue no longer marks unconfirmed legacy entries as synced; recovery state is explicit. There is no durable local capture plus server synchronization/retry/conflict system. |
| User/center administration and password reset | Not implemented end to end | Admin/provisioning endpoints are unavailable; “forgot password” and controlled production provisioning need implementation and delivery/credential infrastructure. |
| Deployment/readiness | Partially verified | SQLite readiness route and production build pass. Docker build remains blocked because Docker daemon is unavailable; backup/restore and packaged restart persistence drills are not verified. |

### Fixes in this audit

- Removed fail-open behavior that silently selected demo data after a configured database-mode health failure. Unknown/unavailable data mode now fails closed, and successful writes refresh using the response mode header rather than a fragile follow-up health probe.
- Added same-origin checks to JSON mutations, multipart uploads/transcription, and forecast POST; production auth secrets now reject sample placeholders and require at least 32 characters. Removed the logout GET route that returned session data.
- Replaced zero-filled fake SQLite dashboard stats with database-backed scoped aggregates; corrected dashboard attention counts and made center/user bootstrap data and persisted follow-ups available to scoped screens.
- Removed invented dashboard trends and a fake offline status count; stale local queue rows marked synced by the prior simulated flow now require recovery and cannot claim confirmed server sync.
- Enforced real calendar dates for child profiles, added growth timestamp schema and pre-birth/future checks, rejected future child DOB updates, and bounded milestone assessment dates to the child’s birth date and current time.
- Clarified SQLite media limitations at the photo and voice capture pages while preserving notes-only voice observation capture.
- Added regressions for missing Origin, calendar validation, sync status recovery, and expanded SQLite integration checks for auth/session boundaries, scoping, dashboard totals, persistence, idempotency, stale updates, invalid input, and safe forecast rejection.

### Verification performed for this audit

| Check | Result |
| --- | --- |
| `npm run db:validate` | PASS — Prisma schema valid. |
| `npx prisma migrate status` | PASS — `prisma/dev.db` schema up to date. |
| `npm run typecheck` | PASS. |
| `npm test` | PASS — 11 Node tests and 18 Vitest tests, 29 total. |
| SQLite HTTP integration with `prisma/test.db` | PASS — migrations current; login/logout, expiry, account disable, role/center updates, same-origin, center and parent isolation, observation persistence/idempotency/stale conflict, validation, readiness, and model-evaluation rejection. Fixtures were removed by the harness. |
| `python3 -m pytest -q ml/tests` | PASS — 68 passed, 2 skipped. This validates ML code/tests, not real-world accuracy. |
| `npm run test:e2e` | PASS — 2 Playwright smoke tests. Initial run found the unauthenticated forecast POST returned 403 before authentication; route ordering was fixed and rerun passed. |
| `npm run lint` | PASS — 0 errors, 63 warnings. Existing warnings are mostly unused symbols plus one image optimization warning. |
| `npm run build` | PASS — optimized Next.js build. |
| Docker image build | BLOCKED — Docker CLI is present, daemon unavailable. |
| Real-data export/training and valid-artifact inference | NOT RUN / NOT POSSIBLE — core PostgreSQL tables previously inspected had zero records; no real monthly series or accepted artifact is available. |

### Outstanding blockers and limitations

- There is no production user/center provisioning flow, and password reset remains nonfunctional.
- Durable session revocation and distributed rate limiting are not implemented; current limits are process-local and cannot protect multi-instance deployment.
- Offline capture/sync, SQLite photo storage, and voice transcription remain unavailable. S3/STT configuration or a supported storage/service backend is required before enabling those workflows.
- No real observation history was found in the inspected PostgreSQL core tables. Real forecast training, holdout MAE/RMSE, and valid model invocation/prediction persistence remain unverified; the API safely rejects invalid evaluation metadata.
- Dashboard UI and other major role workflows do not yet have comprehensive browser tests with authenticated seeded tenants. The checked-in E2E suite remains two smoke tests; API integration is broader.
- Docker daemon, backup/restore drill, and packaged stop/restart persistence were not available/verified. SQLite production deployment must retain the database volume and operate with a single writer instance.
- Lint still reports 63 warnings. They do not fail lint, but were not mass-cleaned as unrelated polish during this audit.

## Critical features implementation update — 16 October 2026

### Changes made

- Added authorized SQLite-backed provisioning APIs and admin screens for centers and accounts. District administrators can create center administrators, workers, and parents; center administrators can create workers and parents only within their own centers. The API does not permit creating district administrators, which must be bootstrapped through controlled deployment administration. No default user or credentials are created.
- Parent account provisioning requires the supplied name, phone, and relationship to match an existing unlinked guardian record and validates each child against the provisioning administrator's center scope. Duplicate normalized email and center code are rejected. Passwords require at least 12 characters and are entered by an administrator for secure out-of-band delivery; there is no email delivery/reset integration.
- User role/password/deactivation changes revoke active sessions. Center deactivation is blocked while active children remain; affected staff assignments/sessions are cleaned up and changes are audited. Account changes prevent self-demotion/deactivation through these endpoints.
- Added the `AuthSession` and `RateLimitBucket` SQLite tables with additive migrations `20261016000000_auth_sessions` and `20261016010000_persistent_rate_limits`. Session resolution validates durable session state plus current user status and scope. Login throttling uses persistent SQLite buckets for single-host deployment and HMAC’d client identifiers; it does not store raw IP addresses.
- Tightened forecast model provenance/readiness checks, including artifact/report identity, real-data validation, chronological holdout sample/metric requirements, baseline comparison, and data cutoff. Health readiness reports model state, and invalid or missing provenance is rejected without creating predictions.
- Fixed standalone startup so relative SQLite database and local model/storage paths resolve from the project root rather than the standalone server's nested working directory. This prevents migrations and requests from accidentally opening different relative database files.
- Expanded isolated SQLite API integration coverage for provisioning, role and center isolation, linked parent access, durable session expiry/revocation, persistent login limits, child registration/profile updates, observations, growth, milestones, follow-ups, reports, idempotency, stale writes, and safe forecast rejection. Added frontend provisioning and model-readiness unit tests.
- Updated login UI to show password recovery as unavailable when no delivery service is configured and removed the inert remember-me option.

### Verification performed

| Check | Result |
| --- | --- |
| `npm run test:sqlite-integration` | PASS — 20 labeled checks, migrations current, provisioning and core workflows persisted through the isolated SQLite API; test-created fixtures were cleaned. |
| `npm test` | PASS — 11 Node tests and 25 Vitest tests, 36 total. |
| `npm run test:e2e` | PASS — 2/2 Playwright smoke tests. |
| `python3 -m pytest -q ml/tests` | PASS — 68 passed, 2 skipped. This is code/test validation only, not real-data accuracy evaluation. |
| `npm run typecheck` | PASS. |
| `npm run db:validate` | PASS — Prisma schema valid. Migrations were applied additively to the local and isolated SQLite databases; neither database was reset. |
| `npm run build` | PASS — optimized production build including provisioning and readiness routes. |
| `npm run lint` | PASS — 0 errors, 59 warnings. |
| Production standalone restart smoke with relative `DATABASE_URL=file:./test.db` | PASS — two invalid login attempts returned 401; after stopping and restarting the server, the same client was rate-limited with 429. This also verified standalone startup used the migrated SQLite database. |
| SQLite backup/restore drill | PASS — used SQLite's backup API on the isolated `prisma/test.db`; restored copy passed `PRAGMA integrity_check` (`ok`) with 23 tables. This does not constitute a production backup/restore rehearsal. |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 production vulnerabilities. |
| `npm audit --audit-level=high` | FAIL — five high-severity findings remain in the development-only Next ESLint dependency chain. npm's suggested forced fix downgrades `eslint-config-next` to 14.2.35, incompatible with the project's Next 16 framework, and was not applied. |
| Docker daemon / image build | BLOCKED — Docker CLI 28.1.1 is installed, but it cannot connect to `unix:///Users/akshaythakur/.docker/run/docker.sock`; Docker image build/startup therefore was not verified. |
| Real monthly history / model training | NOT AVAILABLE — previous read-only PostgreSQL inspection found zero rows in the core observation table. This phase did not find validated 24-month SQLite history, create a real model artifact, or evaluate real-data MAE/RMSE. No prediction accuracy claim is made. |

### Remaining limitations and deployment requirements

- The initial district administrator must be provisioned through a controlled deployment/bootstrap process. No bootstrap command that creates credentials was added.
- Password reset remains explicitly unavailable until an email delivery provider and secure token flow are configured. Administrators must securely deliver initial credentials; the app does not send them.
- SQLite persistent throttling and sessions work across process restart on one host. Multiple replicas require a shared session/rate-limit store and a trusted proxy that sanitizes forwarded IP headers. SQLite deployment must retain its persistent volume and use one writer instance.
- Production backup scheduling, retention, off-host copies, and restore procedures remain operational work. The passing drill covered only an isolated test DB.
- Docker packaging was not validated because the daemon is unavailable. No production startup/deployment readiness claim is made.
- Media upload/transcription and durable offline capture/sync remain disabled/unavailable in SQLite mode. No external storage or transcription service was configured.
- No valid real-data model artifact or sufficient validated monthly history is available; forecast generation stays disabled/rejected when readiness metadata is absent or invalid.
- The two Playwright E2E checks remain smoke tests. Provisioning UI/API are covered by separate component/API tests; role-specific browser workflows have not been fully exercised against a live browser and user setup.
- The full dependency audit still reports five high findings in the dev-only lint dependency chain, and lint has 59 warnings. Neither was addressed through an incompatible framework downgrade or unrelated bulk cleanup.
