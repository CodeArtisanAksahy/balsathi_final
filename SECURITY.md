# Balsathi AI — Security Status and Gaps

## Current use boundary

Demo mode uses synthetic fixtures and allowlisted demo accounts. Demo role selection is not real identity verification. PostgreSQL mode is partial and has not passed a live database security integration test. Do not enter real child, caregiver, or health information in this application.

This document records implemented behavior and known gaps; it is not a security or privacy certification. See `AUDIT_AND_FIX_REPORT.md` for the current audit evidence and verification limits.

## Implemented controls

- Authentication uses signed JWT cookies with `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Production startup rejects the built-in development signing secret.
- Passwords in database mode are checked with bcrypt. Demo accounts remain publicly selectable in demo mode and use shared demo credentials.
- PostgreSQL sessions reload the active user and authorization scope for each request. An inactive or missing account is rejected; changed roles and center assignments apply on the next request.
- Route handlers use role permissions and database child/center scoping for supported PostgreSQL operations. The aggregate forecast is limited to center/district administrators and contains counts rather than child identifiers.
- JSON endpoints enforce content type and a 256 KiB body limit. API responses use `Cache-Control: no-store`.
- Uploads are limited to 10 MiB and an allowlist of MIME types, use generated storage keys, and reject MIME/attachment-kind mismatches. Downloads require an authenticated user with child scope and use no-store, nosniff, and sandbox CSP headers.
- Docker build context excludes local `.env` files, local uploads, dependencies, and test outputs through `.dockerignore`.

## Known gaps

- JWT sessions are stateless. Logging out clears the browser cookie but cannot revoke a copied token before expiry. There is no durable session registry or password reset workflow.
- The application does not enforce a configured `Origin` check for state-changing requests. `SameSite=Lax` is not a complete CSRF policy.
- `AUTH_SECRET` is checked against the development default in production, but minimum entropy/length is not enforced.
- PostgreSQL mode does not implement all screens or routes. Messaging, uploads, chat, transcription, recommendations, provisioning, and some dashboards are incomplete or unavailable.
- No PostgreSQL-backed offline queue synchronization exists. The local queue does not upload queued items. Do not rely on it for data durability.
- The health endpoint reports process liveness only. It does not check PostgreSQL, storage, authentication, model availability, backups, or operational metrics.
- Upload MIME types are validated against the browser-supplied file type and extension is generated from that type; file signatures are not inspected. Deployments should also apply storage and malware-scanning controls appropriate to their data policy.
- The database-backed flows have not been tested against a reachable database with provisioned real accounts in this audit. Authorization boundaries require integration verification before use with sensitive information.
- There is no documented retention/deletion workflow, backup/restore exercise, rate limit for all endpoints, independent penetration test, or privacy/clinical review.

## Data and clinical limits

The assistant and follow-up rules are demonstrations, not clinical decision support. No validated screening model is deployed. Aggregate observation-volume forecasting must only run with a checksum-verified, real PostgreSQL aggregate export, at least 24 consecutive months, accepted chronological holdout evaluation, and a configured artifact. No real-data artifact or accuracy result is currently claimed.
