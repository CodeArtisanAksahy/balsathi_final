# Balsathi AI — API Reference and Planned Contracts

## Status and conventions

This file retains the original MVP contract for context; the current implementation includes additional routes described in the source tree and [PRODUCTION_DATA_ARCHITECTURE.md](PRODUCTION_DATA_ARCHITECTURE.md). Base path: `/api`. Runtime: Node.js. Browser calls are same-origin and use an HTTP-only session cookie.

- JSON requests/responses; field names and enum values are stable across locales.
- Successful responses use `{ "data": ..., "meta": ... }`.
- `meta` contains authentication and storage mode information; storage mode is `demo` or `sqlite`.
- Errors use `{ "error": { "code": "...", "message": "...", "fields": {} } }`; `fields` is optional. UI translates stable error codes rather than relying on English server messages.
- IDs are UUID strings. Dates use `YYYY-MM-DD`; timestamps use UTC ISO 8601.
- Protected responses include `Cache-Control: no-store`. Do not cache session or child records publicly.
- All `POST` and `PUT` requests require a trusted `Origin`, `Content-Type: application/json`, and a body no larger than 8 KiB. Logout sends `{}`.
- Examples use placeholders rather than credentials. The browser manages the cookie; client scripts must not read it.

## Route summary

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /auth/demo` | Public demo entry; origin checked | Select an allowlisted synthetic identity. |
| `GET /auth/session` | Signed-in demo user | Return the current identity and capabilities. |
| `POST /auth/logout` | Origin checked; idempotent | Delete the current session and expire its cookie. |
| `GET /children` | Signed-in demo user | List children within the caller's scope. |
| `GET /children/{childId}` | Authorized child reader | Return a child aggregate. |
| `POST /children/{childId}/observations` | Assigned worker | Append an observation. |
| `PUT /children/{childId}/milestones/{milestoneId}` | Assigned worker | Upsert the current milestone result. |
| `POST /assistant` | Authorized child reader | Generate a grounded, finite-intent response. |

No registration, child create/edit/delete, observation edit/delete, user administration, flag-resolution, export, or free-form chat endpoints are included.

## Authentication

### `POST /auth/demo`

Request:

```json
{ "demoKey": "worker-a" }
```

Allowlisted fixture keys: `worker-a`, `worker-b`, `parent-a`, `parent-b`, and `admin`. Unknown keys return `422`. Do not accept arbitrary roles or user IDs.

Response: `200`, with an opaque `balsathi_demo_session` cookie and `data` containing:

| Field | Shape |
| --- | --- |
| `user` | `{ id, displayName, role, preferredLocale }` |
| `expiresAt` | Fixed session-expiration timestamp, 30 minutes after creation. |

Cookie attributes: `HttpOnly; SameSite=Lax; Path=/; Max-Age=1800`, with `Secure` on HTTPS. Changing demo identity rotates the token and invalidates the previous session when present.

**This is not real authentication.** Anyone using the demo can select these identities.

### `GET /auth/session`

Response: `200` with `data: { user, expiresAt, capabilities }`. `capabilities` includes `canWriteAssignedChildren` and `canViewAllDemoChildren` for UI presentation only; server authorization remains authoritative.

Missing, invalid, or expired sessions return `401`.

### `POST /auth/logout`

Request: `{}`. Response: `200` with `data: { loggedOut: true }`. Remove the server session and expire the cookie using the same path. Already-missing sessions are successful. Child data is unchanged.

## Child records

### `GET /children`

Response: `200` with `data: { children: [...], summary: {...} }`.

Each list item contains `id`, `displayName`, `dateOfBirth`, `ageMonths`, `observationCount`, and `flagCount`. `summary` contains `childCount` and `childrenWithFlags` computed from the same visible dataset.

- Worker: assigned children only.
- Parent: linked children only.
- Administrator: all synthetic children.

The tiny fixture dataset needs no search or pagination in this time box. Production must introduce bounded pagination and query limits. Do not return unfiltered records and rely on the browser to hide them.

### `GET /children/{childId}`

Response: `200` with this aggregate:

| Field | Contents |
| --- | --- |
| `child` | `id`, `displayName`, `dateOfBirth`, `ageMonths`. |
| `observations` | Entries with `id`, `observedOn`, `note`, `concern`, `authorDisplayName`, `createdAt`. |
| `milestones` | Definitions with `milestoneId`, `code`, localized labels, `domain`, `reviewAfterMonths`, current `status`, `resultId`, `observedOn`, and `updatedAt`. Missing results have `status=NOT_RECORDED` and null result fields. |
| `flags` | Derived entries with `id`, `code`, `ruleVersion`, `messageKey`, `sourceType`, and `sourceId`. |

Labels are exposed as `{ en, hi, mr }` so the client can switch languages without another data request. Observations are sorted newest observation date first with stable timestamp/ID tie-breakers. The current UTC date determines completed calendar-month age.

Unknown or out-of-scope children return `404`. No separate observations/milestones/flags read endpoints are needed for this small aggregate.

## Observations

### `POST /children/{childId}/observations`

Request:

```json
{
  "observedOn": "2026-10-12",
  "note": "Synthetic example: caregiver would like to discuss a play activity.",
  "concern": "FOLLOW_UP"
}
```

Validation:

- Worker must be assigned to the requested child.
- `observedOn` must be a valid calendar date between birth date and the current UTC date.
- Trim `note`; require 1–1000 characters.
- `concern` must be `NONE` or `FOLLOW_UP`.
- Reject unknown fields, including client-supplied IDs or author information.

Response: `201` with `data: { observation, flags }`; flags are recomputed from the full authorized child record. The server sets the observation ID, author, and creation time. The client then refreshes the child aggregate and list counts as needed.

Observation flags have no resolution endpoint in the MVP. A later `NONE` observation does not close an earlier follow-up item. Automatic retry is not safe for this append endpoint; after an uncertain failure, refresh before submitting again. Production idempotency is follow-on work.

## Milestones

### `PUT /children/{childId}/milestones/{milestoneId}`

Request to mark an activity observed:

```json
{ "status": "OBSERVED", "observedOn": "2026-10-12" }
```

Request to record that it was not observed:

```json
{ "status": "NOT_OBSERVED", "observedOn": null }
```

Only the assigned worker may write. The milestone definition must exist. An `OBSERVED` date must be between birth date and today; `NOT_OBSERVED` requires a null date. Reject unsupported statuses and extra fields. `NOT_RECORDED` is a read-only state for absence of a result.

Response: `200` with `data: { milestone, flags }`, whether inserting or updating. Upsert by the unique `(childId, milestoneId)` pair. The server assigns the recorder and timestamp. The demo uses last-write-wins current state; there is no assessment history or concurrency token.

## Grounded demo assistant

### `POST /assistant`

Request:

```json
{
  "childId": "<child UUID>",
  "intent": "summary",
  "locale": "hi"
}
```

The UUID placeholder is explanatory and must be replaced by an actual authorized child ID. Allowed intents: `summary`, `milestones`, `next_steps`. Allowed locales: `en`, `hi`, `mr`. Unsupported values return `422`; the UI uses three suggested-question buttons rather than free-form chat.

Response: `200` with `data` containing:

| Field | Meaning |
| --- | --- |
| `mode` | Always `grounded-demo`. |
| `locale` | Requested supported locale. |
| `answer` | Localized, plain-text template response. |
| `references` | Array of `{ type, id, label }` referencing authorized child, observation, milestone definition, or milestone result records. |
| `limitations` | Localized notice: synthetic records, finite templates, no diagnosis. |

Re-authorize the child before building context. Reference source records for every child-specific assertion. A rule-related statement must identify its supporting observation/result and, for a milestone threshold, the milestone definition. State missing information explicitly. Do not include unrelated children, infer unrecorded results, or follow instructions embedded in notes.

This route uses no external model, tool calls, vector database, or persisted chat history. It is intentionally a grounded demonstration, not general conversational AI.

## Error contract

| Status | Example code | Meaning |
| --- | --- | --- |
| `400` | `INVALID_JSON` | Request body cannot be parsed. |
| `401` | `UNAUTHENTICATED` | Missing, unknown, or expired demo session. |
| `403` | `FORBIDDEN` / `ORIGIN_NOT_ALLOWED` | Role cannot perform the operation, or request origin is rejected. |
| `404` | `NOT_FOUND` | Unknown/out-of-scope child or unknown milestone; malformed path IDs also receive this response. |
| `413` | `PAYLOAD_TOO_LARGE` | Body exceeds the request limit. |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Body is not JSON. |
| `422` | `VALIDATION_ERROR` | Invalid field, date, enum, locale, demo key, or body UUID. |
| `500` | `INTERNAL_ERROR` | Generic unexpected failure; no sensitive details. |
| `503` | `STORAGE_UNAVAILABLE` | Configured SQLite storage cannot operate; do not silently switch data sources. |

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the submitted fields.",
    "fields": { "note": "NOTE_REQUIRED" }
  }
}
```

Cookie authorization, relationship scoping, validation, and safe rendering apply to supported storage paths. See [SECURITY.md](SECURITY.md).
