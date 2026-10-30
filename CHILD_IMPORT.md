# Authorized child-record CSV import

The import UI is available to a **District Administrator** at `/admin/import` only when `DATA_MODE=sqlite`. It is not available in demo mode and does not create test children.

## CSV columns

Required: `full_name`, `date_of_birth` (`YYYY-MM-DD`), `center_code`, `assigned_worker_email`, `primary_language` (`en`, `hi`, `mr`), `guardian_name`, `guardian_phone`, `guardian_relationship` (`MOTHER`, `FATHER`, `GRANDPARENT`, `SIBLING`, `OTHER`), `emergency_contact_name`, `emergency_contact_phone`.

Optional: `child_external_id`, `gender` (`FEMALE`, `MALE`, `OTHER`, `UNSPECIFIED`), `milestone_slug`, `assessment_status`, `assessment_date`, `assessment_notes`.

Each row can provide one milestone assessment. Repeat the same child profile fields and `child_external_id` on additional rows to import multiple supplied assessments for that child.

## Safety checks

- Preview validates data and writes nothing.
- The commit must send the exact reviewed CSV hash and explicit confirmation.
- Existing approved identifiers and existing name/date-of-birth/center combinations are rejected as duplicates.
- Every worker email must identify an active worker assigned to the supplied active center.
- Dates must be in the 0–6 age range; assessment dates must be after birth and not in the future.
- Optional milestone rows must reference an active Balsathi milestone and valid saved status.
- The optional 100 children / 10 workers / 10 per worker constraint is reported and can be enforced before commit.
- A single transaction writes all children, guardians, supplied assessments, and audit records; an invalid CSV writes nothing.

No source CSV is persisted by the app and imports do not invoke model inference.
