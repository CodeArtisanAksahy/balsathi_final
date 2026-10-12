# Balsathi AI — Proposed Architecture

## Current status

Design only: this repository does not yet contain application code. This architecture prioritizes a functional, local 30-minute demo. Production gaps are explicit in [SECURITY.md](SECURITY.md).

## Components and data flow

```text
Browser: localized worker / parent / administrator views
    |
    | same-origin JSON requests; HTTP-only demo-session cookie
    v
Next.js App Router route handlers (Node.js runtime)
    |
    +-- session lookup + role/relationship authorization
    +-- input validation
    +-- shared child-data service
            |
            +-- repository
            |     +-- demo: synthetic fixtures + process-local mutations
            |     +-- target: Prisma adapter -> PostgreSQL
            |
            +-- deterministic follow-up rules
            +-- localized, record-grounded assistant templates
```

The browser must never receive database credentials or access Prisma directly. Route handlers and any server-rendered data loaders must use the same authorization-aware service layer. Hiding a control is not an authorization check.

## Planned application organization

These paths describe a future implementation; the files are not present yet.

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` | Demo identity selection and locale selection. |
| `app/dashboard/page.tsx` | Role-aware list and summary presentation. |
| `app/children/[childId]/page.tsx` | Shared child detail, observations, milestones, flags, and assistant panel. |
| `app/api/auth/…/route.ts` | Demo login, current-session lookup, and logout. |
| `app/api/children/…/route.ts` | Authorized reads, observation creation, and milestone upsert. |
| `app/api/assistant/route.ts` | Authorized child-context assembly and template response. |
| `components/` | Shared forms, cards, language selector, and persistent demo banner. |
| `lib/auth.ts` | Opaque session lookup and centralized policy helpers. |
| `lib/data/` | Repository interface, demo store, and eventual Prisma adapter. |
| `lib/risk.ts` | Pure, versioned demonstration rules. |
| `lib/assistant.ts` | Finite-intent grounded responses and source references. |
| `lib/i18n.ts` | English, Hindi, and Marathi dictionaries with English fallback. |
| `prisma/schema.prisma` | Target relational model from `DATABASE_SCHEMA.md`. |

## Storage and deployment boundaries

### Required demo mode

- `DATA_MODE=demo` is the default and needs no database URL.
- Initialize fictional fixtures once in a process-local singleton. Append observations and upsert milestone results in that store.
- Both mutations and sessions survive a browser refresh only while the same server process remains alive. Restarts, cold starts, and development reloads can discard them.
- Multiple visitors selecting the same fixture identity share its synthetic records. Logging out does not reset those records.
- The supported demo environment is one local Node.js process. A memory store is not a dependable persistence or session mechanism across serverless invocations, workers, or replicas.

### PostgreSQL target

- `DATA_MODE=postgres` selects Prisma/PostgreSQL and requires `DATABASE_URL`, migrated tables, and seeded demo identities.
- The adapter must implement the same repository methods and access filters as demo mode.
- This target is conditional follow-on work if the 30-minute budget is consumed by the demo. Do not describe it as verified until migrations and adapter flows actually pass.
- Explicit PostgreSQL mode returns an initialization error or `503` when unavailable; there is no automatic runtime failover to an unrelated dataset.
- Child records can persist in PostgreSQL while demo sessions remain volatile. This configuration is still a synthetic-data demonstration.

## Repository and authorization boundary

The planned interface covers listing visible children, reading one authorized child aggregate, appending an observation, and upserting one milestone result. Pass the server-resolved identity into these operations. Never accept an author ID, worker ID, or access scope supplied by a mutation request.

| Identity | Child scope | Read records/assistant | Add observation | Update milestone |
| --- | --- | --- | --- | --- |
| Worker | `child.workerId === user.id` | Yes | Yes | Yes |
| Parent | `child.parentId === user.id` | Yes | No | No |
| Administrator | All synthetic children in this one demo dataset | Yes | No | No |

Administrator is an overview role in the MVP, not a user-management role. Each child has one assigned worker and one linked parent for this simplified model. Real caregiver relationships and organization boundaries require a richer model.

List queries are scoped before records are returned. Child detail, mutations, and assistant context are authorized independently on the server. An out-of-scope child returns `404`; protected routes without a valid session return `401`.

## Demo authentication

`POST /api/auth/demo` accepts an allowlisted fixture key, not an arbitrary role or user ID. Generate a cryptographically random, opaque session token and store its mapping to the seeded identity in server memory for 30 minutes. Issue it in the `balsathi_demo_session` cookie.

Use `HttpOnly`, `SameSite=Lax`, `Path=/`, fixed `Max-Age=1800`, and `Secure` on HTTPS. Allow plain HTTP only for local development. Rotate the session when changing demo identity. Logout removes the server entry and expires the cookie.

Anyone can select a demo identity. Cookie possession is not proof of a real worker's or caregiver's identity. No real child information belongs in this mode.

## Language handling

- Supported locale codes: `en`, `hi`, and `mr`.
- Store the display preference locally in the browser; it grants no permissions and contains no child data.
- Use fixed dictionaries for UI, errors, sample milestone descriptions, flag descriptions, and assistant templates. Fall back to English for a missing key and report missing translations during verification.
- API enums and error codes remain stable English identifiers; presentation is localized by the client. Assistant requests explicitly include the selected locale.
- Dates are stored as ISO calendar dates or UTC timestamps and formatted with the selected locale.
- Notes and synthetic names are displayed verbatim as plain text, never automatically translated or rendered as HTML.

## Demonstration follow-up rules

Rules are a small, explainable presentation feature, not a validated screening instrument. Return `code`, `ruleVersion`, `sourceType`, `sourceId`, and a localization key for each flag.

1. `OBSERVATION_FOLLOW_UP`: an observation explicitly has `concern=FOLLOW_UP`. Each such observation produces a flag. Later `NONE` observations do not resolve it; resolution is outside this MVP.
2. `MILESTONE_REVIEW`: the child's completed calendar-month age is at least a sample definition's `reviewAfterMonths`, and a worker has explicitly recorded `NOT_OBSERVED`. The age calculation uses the current UTC date. These sample thresholds are illustrative and not clinical guidance.
3. No record means `NOT_RECORDED`. It never produces an adverse developmental conclusion.

Use a neutral **“Discuss with your worker”** presentation rather than a diagnostic severity score. The absence of flags does not mean a child has been assessed as healthy. Derived flags are recalculated on reads and after writes; no separate risk table is needed.

## Grounded demo assistant

The MVP assistant is a deterministic local function, clearly labeled **“Demo assistant — record-based templates.”** It is not an LLM integration.

- Accept only `summary`, `milestones`, and `next_steps` intents exposed as localized suggested-question buttons.
- Build context from the same authorized child aggregate used by the detail page.
- Cite every record-specific statement using child, observation, milestone, or rule-source references. Resolve references only within the permitted child.
- State when dates, observations, or milestone results are missing. Never turn missing data into a negative result or a diagnosis.
- Offer generic, non-diagnostic next steps such as recording another observation or discussing a flagged item with a trained worker.
- Treat notes as data. They cannot change instructions, invoke tools, or trigger network requests.
- Do not provide free-form medical chat, medication advice, or automated clinical decisions.

## Explicit production gaps

Production requires verified authentication, durable sessions, organization tenancy, caregiver consent and access lifecycle, audited mutations, reviewed developmental content, secure operations, retention/deletion controls, accessibility and language review, durable database deployment, and broader automated checks. See [SECURITY.md](SECURITY.md).
