# Balsathi AI

**Functional demo MVP.** This repository contains a Next.js application, API routes, synthetic demo data, and a Prisma schema for the planned PostgreSQL persistence layer.

Balsathi AI is planned as a small child-development record demonstration for workers, parents, and administrators, with English, Hindi, and Marathi UI and a record-grounded demo assistant.

> **Demo only:** use fictional people and synthetic records. Demo role selection is not real authentication. Sample milestones and follow-up flags are not a validated screening tool or a clinical assessment.

## Planned MVP experience

- Select an allowlisted demo worker, parent, or administrator and receive a short-lived HTTP-only session cookie.
- View seeded child records appropriate to that identity.
- As an assigned worker, add a dated observation and record a sample milestone result.
- See transparent follow-up flags linked to their underlying observation or milestone result.
- As a parent, view only linked synthetic children; as an administrator, view all demo records and summary counts. Both views are read-only.
- Switch static UI and assistant responses among English (`en`), Hindi (`hi`), and Marathi (`mr`). Entered notes retain their original text.
- Use three assistant prompts—summary, milestones, and next steps—with answers generated from the selected child's authorized records and source references.

The assistant is a **local template-based demo**, not an external LLM or unrestricted medical chatbot. Unknown information stays unknown.

## Technical target

| Layer | Planned choice |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript; shared role-aware components. |
| API | Same-origin Next.js route handlers on the Node.js runtime. |
| Required demo storage | Synthetic fixtures plus process-local, in-memory mutations. |
| Persistence target | Prisma with PostgreSQL behind the same repository contract. |
| Demo identity | Server-side, process-local sessions with opaque HTTP-only cookies. |
| Localization | Small English/Hindi/Marathi dictionaries and assistant templates. |
| Follow-up logic | Explainable demonstration rules; no diagnostic scores or predictive model. |

## Storage behavior and time-box boundary

The required 30-minute walkthrough defaults to `DATA_MODE=demo` and runs without PostgreSQL or AI credentials. This is the intended demo-data fallback. Changes remain available only while the same server process and store remain alive; restarting, reloading the development server, or a cold start may reset both records and sessions. Visitors choosing the same demo identity share its synthetic records.

`DATA_MODE=postgres` is the persistence target. It requires a completed Prisma adapter, applied schema, database connection, and demo seed data. Provisioning and verifying that path may fall outside the 30-minute budget and must be reported as pending if unfinished. Explicit PostgreSQL mode must fail clearly rather than silently switch datasets when unavailable.

The supported initial demo runs in one local Node.js process. A serverless/multi-instance deployment is not a reliable home for this memory-backed store or its sessions. PostgreSQL storage alone does not make the application production-ready.

## Documentation

| File | Contents |
| --- | --- |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Minute-by-minute build order, mandatory demo scope, acceptance checks, and deferrals. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, role boundaries, storage modes, localization, flags, and assistant grounding. |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Proposed relational model, constraints, seed data, and repository parity. |
| [SECURITY.md](SECURITY.md) | Demo limitations, proposed controls, verification checklist, and production gaps. |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Planned request/response contracts, authorization, validation, and error behavior. |

## Local setup

Install Node.js 20.19 or later, then run:

1. `npm install`
2. Copy `.env.example` to `.env` and set a strong `AUTH_SECRET`.
3. `npm run dev`

Validate the application with `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. PostgreSQL schema validation requires `DATABASE_URL` to be set.

### Proposed configuration

These names are design contracts, not existing configuration files:

| Variable | Planned behavior |
| --- | --- |
| `DATA_MODE` | `demo` by default; `postgres` explicitly requests the target database adapter. |
| `APP_ORIGIN` | Trusted browser origin; local default `http://localhost:3000`. |
| `DATABASE_URL` | Server-only PostgreSQL connection string, required only in PostgreSQL mode. Supply through an ignored local environment file or secret store; no value is included here. |

No external AI API key or session-signing secret is required for the proposed in-memory opaque-session demo. Session tokens are generated at runtime and must never be logged.

## Deferred production work

Real authentication, durable sessions, multi-organization access, caregiver consent, secure hosting, auditable history, data retention/deletion, backups, clinically reviewed content, free-form AI integration, offline support, attachments, notifications, and formal language/accessibility review are outside this time box.

Child records are seeded and readable; creation, editing, and deletion are deferred. Observation creation and milestone updates are the deliberately small write workflow. The administrator view provides visibility rather than management tools.

## Verification status

Verified locally: TypeScript typecheck, lint (with no errors), the seeded-data test suite, the production build, and Prisma schema validation all pass. Schema validation requires a configured `DATABASE_URL`; it does not connect to the database.
