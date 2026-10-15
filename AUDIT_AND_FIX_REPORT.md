# Balsathi AI — Audit and Fix Report

**Audit date:** 15 October 2026
**Scope:** repository documentation, build/start configuration, authentication and authorization paths, dashboard/API behavior, uploads, offline queue, selected PostgreSQL/forecast code, dependency configuration, and available automated checks.

## Executive summary

The project builds and runs in demo mode. PostgreSQL support remains partial and could not be exercised against a live database in this environment. Source and documentation were inconsistent about production status, offline sync, authentication, and system-health measurements. This audit fixed confirmed issues and added smoke/regression tests, but it is not a production-readiness or security certification.

No real historical PostgreSQL observation data was queried. No production model artifact was trained, and no predictive-accuracy claim is made. Ignored ML assets are synthetic test fixtures.

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
