# Balsathi AI — Security Status and Gaps

## Current use boundary

Use synthetic or fictional records only. Demo role selection is not real identity verification, and the app is not a clinical decision system. SQLite mode is a local/single-instance application mode, not a production privacy or security certification. Do not enter real child, caregiver, or health information before the required security, privacy, and operational review.

## Implemented controls

- Authentication uses signed JWT cookies with `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Production startup rejects the built-in development signing secret.
- SQLite database account passwords are checked with bcrypt. Demo accounts remain publicly selectable in demo mode and use shared demo credentials.
- SQLite sessions are stored durably and re-check active user, role, and authorization scope on each request. Logout and account status/password/role changes revoke stored sessions.
- Authenticated account and center provisioning enforces administrator roles, center scope, duplicate-account checks, and guardian-link validation. The first district administrator still requires a controlled bootstrap process; initial passwords must be delivered out of band.
- Login rate-limit buckets persist in SQLite across process restarts on a single host. They are not a shared multi-instance limiter; forwarded client IP headers must be sanitized by a trusted proxy.
- Supported database route handlers use role permissions and child/center scoping. Aggregate forecasting is limited to center/district administrators and contains monthly counts rather than child identifiers.
- JSON endpoints enforce content type and a 256 KiB body limit. API responses use `Cache-Control: no-store`.
- Uploads are limited to 10 MiB and an allowlist of MIME types, use generated storage keys, and reject MIME/attachment-kind mismatches. Downloads require an authenticated user with child scope and use no-store, nosniff, and sandbox CSP headers.
- Docker build context excludes local `.env` files, local uploads, dependencies, and test outputs through `.dockerignore`.

## Known gaps

- There is no email provider or self-service password reset workflow. Initial account passwords require secure out-of-band delivery.
- Same-origin checks are present on supported mutation handlers, but this is not a full deployment-wide CSRF policy for every route.
- `AUTH_SECRET` must be unique and at least 32 characters in production; deployments remain responsible for secret generation and rotation.
- Messaging, uploads, chat, transcription, recommendation delivery, notifications, and content management are not all fully persisted/configurable in SQLite. Unsupported admin screens now identify their unavailable controls instead of presenting sample data as current records.
- No durable offline queue synchronization exists. The local queue does not upload queued items. Do not rely on it for data durability.
- The readiness endpoint checks SQLite connectivity and reports model readiness, but not storage, authentication configuration, backups, or operational metrics.
- Upload MIME types are validated against browser-supplied type and extension; file signatures are not inspected. Deployments should apply storage and malware-scanning controls appropriate to their data policy.
- SQLite mode requires a persistent writable local volume and a single application instance. Backup/restore, retention/deletion, and migration from existing PostgreSQL records have no automated operational workflow.
- There is no independent penetration test, privacy/clinical review, or verified production deployment.

## Data and clinical limits

The assistant and follow-up rules are demonstrations, not clinical decision support. No validated screening model is deployed. Aggregate observation-volume forecasting requires a checksum-verified real aggregate export, at least 24 consecutive months, accepted chronological holdout evaluation, and a configured artifact. No real-data artifact or accuracy result is currently claimed.
