# Balsathi AI — Implementation History

This document began as a 30-minute plan for a synthetic-data demonstration. The repository now contains the implemented Next.js application and a Prisma SQLite persistence path. The original plan is retained in Git history; current runtime and verification instructions are in [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [PRODUCTION_DATA_ARCHITECTURE.md](PRODUCTION_DATA_ARCHITECTURE.md).

## Current implementation status

- `DATA_MODE=demo` provides synthetic fixtures and process-local state.
- `DATA_MODE=sqlite` configures Prisma to use SQLite and enables supported database routes.
- SQLite migrations and an isolated local integration harness are included.
- Forecasting only uses aggregate monthly counts and fails closed when accepted model/evaluation artifacts or sufficient history are unavailable.
- The existing PostgreSQL migration files are preserved separately. Switching to SQLite does not migrate PostgreSQL records.

## Acceptance checks

Run `npm run db:validate`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. For database-backed API behavior, use the opt-in `npm run test:sqlite-integration` only with a dedicated empty test database. Read [AUDIT_AND_FIX_REPORT.md](AUDIT_AND_FIX_REPORT.md) for actual results and limitations.

## Remaining production work

Provisioning and password recovery, durable session revocation, offline synchronization, full persistence for all screens, backup/restore operations, data retention/deletion, multi-instance deployment, privacy/security review, and validated clinical content remain outside this implementation.
