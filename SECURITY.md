# Balsathi AI — Demo Security and Production Gaps

## Current status and permitted data

This document describes intended controls; no application or security checks have been implemented in this documentation-only repository.

The 30-minute MVP is a **synthetic-data demonstration**. All users can choose an allowlisted demo identity. It is unsuitable for real child, caregiver, or health information, even if its storage is switched to PostgreSQL.

Show the demo label on login, dashboards, child pages, and the assistant. Display the storage mode and explain that in-memory changes can disappear on restart.

## Demo identity and sessions

- Accept only predefined `demoKey` values. Never trust a role, user ID, or author ID supplied by the client.
- Generate opaque session tokens using a cryptographically secure random generator with at least 32 random bytes.
- Keep identity mappings on the server. Do not place names, roles, child records, or database details in the cookie.
- Set `balsathi_demo_session` with `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Max-Age=1800`; set `Secure` on HTTPS. Plain HTTP is limited to local development.
- Enforce the same fixed 30-minute expiry server-side. Rotate the session on identity changes, and delete its server entry on logout.
- Session storage is process-local and must remove expired entries. Restarting the process invalidates all sessions.

These measures reduce accidental client tampering; they do not establish real identity. Anyone reaching the demo selector can assume any offered fixture identity. The deployment remains a shared demo sandbox.

## Server-side authorization

| Action | Worker | Parent | Administrator |
| --- | --- | --- | --- |
| List/read children | Assigned only | Linked only | All demo children |
| Read observations, milestones, flags | Same child scope | Same child scope | All demo children |
| Use assistant | Same child scope | Same child scope | All demo children |
| Add observations | Assigned only | Denied | Denied |
| Update milestones | Assigned only | Denied | Denied |
| Create/delete children or manage users | Not in MVP | Not in MVP | Not in MVP |

Enforce these rules in route handlers/shared services and repository queries. Re-check child scope for every request, including assistant requests and mutations. Do not infer access from a previously loaded page.

Return `401` for missing/expired sessions, `403` for an authenticated role's forbidden operation, and `404` for an unknown or out-of-scope child. Keep response bodies consistent so inaccessible records are not disclosed.

## Request and rendering controls

- Same-origin application only; do not enable permissive CORS.
- Require an `Origin` matching the configured `APP_ORIGIN` for all state-changing requests, including demo login and logout. Reject missing or mismatched origins for this browser-only API.
- Require `application/json` for request bodies. Reject unexpected fields and invalid enums. Use a small body limit, such as 8 KiB, before parsing; enforce note length separately.
- Validate UUIDs, calendar dates, child ownership, and milestone existence. Observed dates must fall between birth date and the current UTC date.
- Obtain author/recorder identity from the session. Generate IDs and timestamps on the server.
- Render notes and names as escaped text; do not render supplied HTML or execute note content.
- Use Prisma's parameterized queries in the target adapter. Do not interpolate client content into SQL.
- Send `Cache-Control: no-store` on session and child-data API responses. Do not share-cache personalized server-rendered views.
- Return generic server errors. Do not expose stack traces, database URLs, session tokens, or raw request bodies.

`APP_ORIGIN` should default to `http://localhost:3000` for the local demonstration and be explicitly configured for any other origin. Do not construct the trusted origin from unvalidated forwarded headers.

## Child data, logs, and retention

- Use fictional names and observations only. No photos, government IDs, contact details, or real case notes are needed.
- Keep credentials out of source control. `DATABASE_URL`, when eventually needed, belongs in an ignored local environment file or deployment secret store. No credential values are included in these docs.
- No `NEXT_PUBLIC_` variable may contain database credentials or session material.
- Do not log cookies, child notes, full request bodies, or assistant context. Minimal operation/error metadata is enough for the demo.
- Demo memory is reset on process restart; this is not a retention or deletion guarantee. Logout removes the session, not child records.
- PostgreSQL-backed demo records remain until explicitly reset. A managed retention/deletion workflow is not implemented by this plan.
- No analytics or external model calls are required. Assistant context stays in the application process.

## Grounding and clinical limits

The assistant uses finite, localized templates over authorized records. Notes are untrusted data, never instructions. Responses must cite supporting records, identify missing information, and avoid invented observations.

Follow-up flags use unvalidated demonstration rules and sample milestone thresholds. They are not diagnoses, medical advice, emergency triage, or a validated screening result. Missing data and absence of flags must not be presented as proof of normal development. Production clinical content requires qualified review and a defined escalation workflow.

## Required checks before calling the demo functional

1. An expired, fabricated, or logged-out session cannot read child data.
2. A parent cannot fetch another parent's child by changing the URL or assistant request.
3. A worker cannot write to another worker's child; parents and administrators cannot write at all.
4. An invalid milestone or cross-child source reference is rejected.
5. Invalid/oversized notes, malformed JSON, and future/pre-birth dates are rejected.
6. State-changing requests with a missing or mismatched origin are rejected.
7. Notes resembling HTML or instructions remain inert text and cannot influence authorization or assistant behavior.
8. API responses and logs contain no credentials, cookies, or stack traces.

These are proposed checks. Their results must be recorded after implementation; none are claimed as executed here.

## Production readiness work

Before admitting real data, implement and review:

- Verified identity, account provisioning, caregiver linkage, session revocation, and durable session storage.
- Organization-scoped authorization, least privilege, and tested tenant isolation.
- Appropriate caregiver consent, purpose limitation, retention/deletion/export processes, and jurisdiction-specific privacy obligations.
- Durable PostgreSQL deployment, migration governance, restricted database credentials, encryption in transit/at rest, backups, and tested recovery.
- Auditable changes, assessment history, concurrency handling, access monitoring, rate limits, and incident response.
- Dependency updates, deployment hardening, security testing, accessible UI, and professional language/content review.
- Clinically reviewed milestones and rules, accountable follow-up workflows, and documented limitations.
- If an external AI service is later added: provider/data review, minimum-necessary context, consent where required, prompt-injection defenses, output evaluation, and human oversight.

This document is not a certification of security, privacy compliance, or clinical validity.
