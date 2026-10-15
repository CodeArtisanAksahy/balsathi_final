# Balsathi AI

**Local demo and SQLite-backed application.** This repository contains a Next.js application, Prisma persistence, demo fixtures, and an aggregate observation-volume forecast workflow. SQLite is intended for local and single-instance use; production operations, privacy review, and durable backup procedures still need work.

Balsathi AI is a child-development record demonstration for workers, parents, and administrators, with English, Hindi, and Marathi UI and a record-grounded assistant.

> **Demo and safety boundary:** use fictional people and synthetic records. Demo role selection is not real identity verification. Sample milestones and follow-up flags are not a validated screening tool or a clinical assessment.

## Storage modes

- `DATA_MODE=demo` uses synthetic fixtures and process-local mutations. It needs no database and does not provide durable storage.
- `DATA_MODE=sqlite` uses Prisma with a local SQLite file. The default `DATABASE_URL="file:./dev.db"` resolves to `prisma/dev.db` relative to `prisma/schema.prisma`.
- Database errors do not silently switch to demo records. The browser never connects to SQLite directly.

SQLite is suited to local development or a single application instance with a persistent writable disk. Do not share a SQLite file between application replicas or place it on an unverified network filesystem.

The existing PostgreSQL database and its records are **not** imported into SQLite by changing `DATA_MODE`. PostgreSQL migration history is retained under `prisma/postgresql-migrations-legacy/` for reference. Keep PostgreSQL backups until you have independently verified any needed export/import.

## Local setup

Install Node.js 20.19 or later, then run:

```sh
npm install
cp .env.example .env
# Set a strong AUTH_SECRET in .env
npm run db:generate
npm run db:migrate:deploy
npm run dev
```

The checked-in SQLite migration creates a fresh database. The repository has no seed or user-provisioning workflow; database accounts and centers must be provisioned through a controlled process before SQLite login is usable.

Validate changes with `npm run db:validate`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

### SQLite backup and restore

Stop the application before copying the default database file:

```sh
cp prisma/dev.db prisma/dev.db.backup
```

To restore, stop the app, preserve the current file, then copy the verified backup back to `prisma/dev.db`. For active deployments, use a SQLite-aware online backup mechanism and regularly test restores. SQLite database files are local application data and are ignored by Git.

### Docker

Set a strong `AUTH_SECRET` in the environment or ignored `.env` file, then:

```sh
docker compose up --build app
```

Compose mounts a named volume at `/app/data` and configures `DATABASE_URL=file:/app/data/balsathi.db`. The standalone container startup applies pending Prisma migrations before serving requests. The liveness endpoint is `/api/health`; `/api/health/ready` checks SQLite connectivity.

## Forecasting

The forecast API and admin chart use aggregate monthly observation counts. They do not expose child identifiers. Generating predictions is an explicit admin action. A prediction is rejected if the model artifact/evaluation is missing, untrusted, or the database history is insufficient. No synthetic data should be presented as real predictive validation. See [PRODUCTION_DATA_ARCHITECTURE.md](PRODUCTION_DATA_ARCHITECTURE.md) for export, training, and validation details.

## Documentation

| File | Contents |
| --- | --- |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Original build plan and subsequent implementation notes. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, authorization, and storage modes. |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Current Prisma schema and constraints. |
| [SECURITY.md](SECURITY.md) | Data-use limits, implemented controls, and remaining gaps. |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Request/response contracts and authorization. |
| [PRODUCTION_DATA_ARCHITECTURE.md](PRODUCTION_DATA_ARCHITECTURE.md) | SQLite operations, forecast workflow, and verification. |
| [AUDIT_AND_FIX_REPORT.md](AUDIT_AND_FIX_REPORT.md) | Audit history and current verification evidence. |

## Remaining production work

SQLite mode supports the tested child, observation, authentication, scoping, and forecast-history flows. Recommendation, messaging, uploads, and chatbot persistence are not all implemented against the database. User provisioning, password reset/revocation, retention/deletion, backup/restore operations, multi-instance deployment, clinical review, and privacy/security review remain necessary before real-world use.
