# Balsathi AI — Current Architecture

## Components and data flow

```text
Browser: localized worker / parent / administrator views
    |
    | same-origin JSON requests; HTTP-only session cookie
    v
Next.js App Router route handlers (Node.js runtime)
    |
    +-- session lookup + role/relationship authorization
    +-- input validation
    +-- shared child-data service
            |
            +-- demo: synthetic fixtures + process-local mutations
            +-- sqlite: Prisma adapter -> local SQLite database
            +-- deterministic follow-up rules
            +-- localized, record-grounded assistant templates
```

The browser must never receive database credentials or access Prisma directly. Route handlers and server-side data loaders use the authorization-aware service layer. Hiding a control is not an authorization check.

## Storage modes

### Demo mode

- `DATA_MODE=demo` needs no database URL and defaults to synthetic fixtures.
- Server-side demo mutations and sessions are process-local and can disappear on restart or development reload.
- Multiple visitors selecting the same fixture identity share synthetic records. No real child information belongs in demo mode.

### SQLite mode

- `DATA_MODE=sqlite` selects Prisma/SQLite and uses `DATABASE_URL`, defaulting to `file:./dev.db` relative to `prisma/schema.prisma`.
- The application does not silently replace database errors with demo data.
- SQLite is for local or single-instance use with a persistent writable local disk. Do not share a database file across application replicas or an unverified network filesystem.
- The existing PostgreSQL database is separate. Switching modes does not copy its records; see [PRODUCTION_DATA_ARCHITECTURE.md](PRODUCTION_DATA_ARCHITECTURE.md).

## Repository and authorization boundary

The service layer accepts a server-resolved identity and applies scope before returning records. Never accept an author ID, worker ID, or access scope supplied by a mutation request.

| Identity | Child scope | Read records/assistant | Add observation | Update milestone |
| --- | --- | --- | --- | --- |
| Worker | Assignment or center | Yes | Yes | Yes |
| Parent | Guardian links | Yes | No | No |
| Center administrator | Assigned centers | Yes | As permitted by route | As permitted by route |
| District administrator | Active records | Yes | As permitted by route | As permitted by route |

List queries are scoped before records are returned. Child detail, mutations, and assistant context are authorized independently on the server. An out-of-scope child returns `404`; protected routes without a valid session return `401`.

## Assistant and follow-up rules

Rules are explainable demonstrations, not validated screening. Missing records remain unknown and do not produce adverse conclusions. Assistant responses are grounded in authorized records and source references; they do not provide unrestricted medical advice or diagnoses.

## Operational boundary

SQLite provides local durable persistence when its file is on a persistent disk. Authorized center/account provisioning and durable session revocation are implemented for SQLite, but the first district-admin bootstrap, production backup/restore, retention/deletion, multi-instance coordination, and deployment security workflows remain incomplete. Those limits are listed in [SECURITY.md](SECURITY.md).
