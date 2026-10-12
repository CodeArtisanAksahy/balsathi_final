# Balsathi AI — 30-Minute MVP Implementation Plan

## Status and outcome

This repository currently contains planning documentation only. The application, routes, database migrations, translations, and checks below are proposed work, not completed functionality.

**Time-boxed outcome:** a local, single-process demonstration in which a worker selects a synthetic child, records an observation, updates a sample milestone, and sees explainable follow-up flags. A parent can view their linked synthetic child; an administrator can view all demo children and summary counts. The interface and a record-grounded demo assistant support English, Hindi, and Marathi.

All screens must display **“Demo — synthetic data; not a clinical assessment.”** Cookie-based demo identity selection is a walkthrough mechanism, not production authentication.

## Definition of the 30-minute MVP

| Area | Required demo behavior |
| --- | --- |
| Stack | Next.js App Router, TypeScript, React, Node.js route handlers; one application and one local process. |
| Storage | Typed repository with synthetic fixtures and process-local mutable data. Prisma/PostgreSQL is the documented persistence target. |
| Identity | Select a seeded worker, parent, or administrator; receive an opaque, short-lived, HTTP-only session cookie. |
| Child records | Seeded child list and detail views, filtered by the current demo identity. Child registration, editing, and deletion are outside this time box. |
| Observations | Assigned workers can append a dated note with `NONE` or `FOLLOW_UP` concern. Authorized readers see the history. |
| Milestones | Three small, explicitly illustrative milestone definitions. Workers record `OBSERVED` or `NOT_OBSERVED`; a missing record displays `NOT_RECORDED`. |
| Flags | Deterministic, source-linked follow-up prompts from explicit observations and recorded milestone results. No prediction or diagnosis. |
| Views | Worker task view; linked-parent read-only view; administrator read-only overview and counts. Share components across views. |
| Languages | Static UI labels, validation messages, milestone labels, flags, and assistant templates in `en`, `hi`, and `mr`. Notes remain in the language entered. |
| Assistant | Three suggested prompts: summary, milestones, and next steps. A local template function answers only from authorized child data and includes references. |

Use three fictional children, two workers, two parents, and one administrator. The second worker and parent provide a concrete authorization-boundary check. The demo selector may expose all seeded identities because the entire dataset is synthetic.

## Minute-by-minute order

| Minutes | Work | Completion signal |
| --- | --- | --- |
| 00–04 | Scaffold Next.js/TypeScript; create a shared layout, demo banner, and language dictionaries. | Application opens locally and language selection changes core navigation. |
| 04–08 | Define repository types, fixtures, and in-memory reads/writes; map the Prisma target from `DATABASE_SCHEMA.md`. | Child detail can be loaded from synthetic data. |
| 08–12 | Add demo-session routes, cookie lookup, role/relationship authorization, and identity selector. | Worker, parent, and administrator see their permitted children. |
| 12–19 | Build shared child list/detail, observation form, milestone controls, and derived flags. | A worker mutation changes the visible child record and flags. |
| 19–23 | Finish role-specific presentation and Hindi/Marathi UI strings. | Parent is read-only; administrator sees all demo records; all three locales render. |
| 23–26 | Add the grounded assistant route and three localized suggested prompts. | Each response identifies its supporting records and handles missing data. |
| 26–30 | Run focused smoke checks, fix broken flows, and record actual results. | Core demo works end to end; build/typecheck results and remaining gaps are stated honestly. |

This is a best-effort schedule, assuming Node.js and package installation work promptly. If setup consumes the budget, report unfinished items instead of claiming completion. Prefer basic shared components over visual polish.

## PostgreSQL target and fallback decision

- The required walkthrough runs in **demo mode** without a database or external AI service.
- `DATA_MODE` defaults to `demo`. Its in-memory repository is the deliberate demo-data fallback.
- `DATA_MODE=postgres` is a future persistence path using Prisma and `DATABASE_URL`. Provisioning a hosted database and proving migrations are not part of the mandatory 30-minute outcome.
- Implement or exercise the PostgreSQL adapter within the time box only if a working local database is already available and the core demo is complete.
- An explicitly requested PostgreSQL mode must fail clearly if its adapter, schema, or connection is unavailable. Never silently replace it with demo data after a failure.
- PostgreSQL storage does not upgrade demo authentication into production authentication.

## Acceptance checks

Record these as checks performed, not as guarantees supplied by this document:

1. Start without a database; see the synthetic-data banner and in-memory storage label.
2. Select a worker; see only assigned children. Add an observation and mark a milestone.
3. Reload within the same server process; observe the saved in-memory mutation.
4. Select a parent; see only linked children. A direct write request returns `403`.
5. Request an unrelated child as a worker or parent; receive `404`. Anonymous protected requests return `401`.
6. Select an administrator; see all demo children and summary counts, with read-only controls.
7. Switch among English, Hindi, and Marathi; check navigation, forms, statuses, flags, and assistant replies. User-entered notes do not change.
8. Verify a follow-up observation creates a source-linked flag. Missing milestone data stays unknown, not “delayed.”
9. Ask each suggested assistant prompt; responses use the selected authorized child only, cite records, and avoid invented facts.
10. Log out; the cookie/session no longer grants access. Restart the server; demo mutations and sessions reset.
11. Check invalid dates, empty/oversized notes, unknown milestone IDs, and a disallowed request origin.
12. Run the eventual project's TypeScript and production-build commands; record their real output. No such commands can run from this documentation-only repository yet.

## Deliberately outside the time box

Real identity verification, consent collection, multi-organization tenancy, production hosting, clinical scoring, validated developmental screening, growth charts, attachments, notifications, offline synchronization, exports, free-form LLM chat, and operational audit/recovery workflows are follow-on work.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [SECURITY.md](SECURITY.md), and [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for the proposed contracts.
