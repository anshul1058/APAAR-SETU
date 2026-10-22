# System Overview

Single source of truth for roles, data model, validation rules, lifecycle, and security. Other docs reference rule codes and table names defined here.

LLM system prompts are in `aiml_guide.md`.

---

## 1. Roles and permissions (RBAC)

| Role | Can do | Cannot do |
|---|---|---|
| `institution_admin` | Upload and edit own institution's students, view own validation reports and tracker | See other institutions, see national dashboards |
| `aicte_officer` | Read all institutions, view flags/anomalies, generate reports, run assistant queries | Edit student records directly |
| `aicte_admin` | Everything an officer can, plus manage users, institutions, intake approvals | - |
| `verifier` | Request verification of a student (needs student consent), see signed result | Browse student lists |
| `student` (future) | Approve or revoke consent, see own record | - |

Every endpoint declares its allowed roles. Institution users are scoped by `institution_id` taken from the JWT, never from the request body.

## 2. Data model

```
institutions(id, name, state, aicte_code, created_at)
courses(id, institution_id, name, branch, academic_year,
        approved_intake, approved_supernumerary)
students(id, apaar_id, institution_id, course_id, student_code,
         full_name, dob, gender, category, quota_type, nationality,
         admission_date, email_hash, status, source_upload_id,
         created_at, updated_at)
uploads(id, institution_id, filename, total_rows, valid_rows,
        invalid_rows, status, uploaded_by, created_at)
validation_flags(id, upload_id, student_id, row_number, rule_code,
                 severity, message, details_json, resolved, created_at)
anomaly_scores(id, institution_id, course_id, academic_year,
               score, reasons_json, created_at)
consents(id, student_id, verifier_id, purpose, otp_hash,
         granted_at, expires_at, revoked)
verifications(id, student_id, verifier_id, consent_id, result,
              signature, created_at)
audit_logs(id, user_id, role, action, resource, resource_id,
           ip, created_at)
users(id, email, password_hash, role, institution_id, created_at)
```

Notes:
- `quota_type` is one of `regular`, `supernumerary`, `nri`, `oci`, `fn`.
- `status` is one of `pending`, `valid`, `flagged`, `rejected`.
- Unique key candidates: `(apaar_id, academic_year)` for active enrolment.

Read-only views for the LLM text-to-SQL layer (never the raw tables):

```
v_institution_summary, v_course_intake_status, v_flag_summary, v_duplicate_enrolments
```

## 3. Validation rule catalogue

| Code | Severity | Rule | Scope |
|---|---|---|---|
| `APAAR_MISSING` | error | APAAR ID is empty | row |
| `APAAR_FORMAT` | error | APAAR ID does not match the configured pattern (default 12 digits) | row |
| `APAAR_NOT_FOUND` | error | Mock/real APAAR service says ID does not exist | row |
| `DUP_IN_UPLOAD` | error | Same APAAR ID appears twice in one file | file |
| `DUP_IN_INSTITUTION` | error | APAAR ID already enrolled in this institution for the same year | db |
| `DUP_CROSS_INSTITUTION` | error | APAAR ID active in another institution for the same year | db |
| `FUZZY_DUPLICATE` | warning | Name + DOB similarity above threshold with another record | db |
| `INTAKE_EXCEEDED` | error | Enrolled > approved intake + approved supernumerary for the course | aggregate |
| `SUPERNUMERARY_EXCEEDED` | error | Supernumerary admits > approved supernumerary seats | aggregate |
| `FIELD_MISSING` | error | Required field empty (name, DOB, course, quota, admission date) | row |
| `DOB_INVALID` | error | DOB in the future or implies an implausible age | row |
| `ADMISSION_DATE_INVALID` | error | Admission date outside the academic year window | row |
| `QUOTA_NATIONALITY_MISMATCH` | warning | NRI/OCI/FN quota inconsistent with nationality | row |
| `CATEGORY_INVALID` | error | Category not in the allowed list | row |
| `ANOMALY_HIGH` | warning | Institution/course anomaly score above threshold | aggregate |

Severity rules:
- `error`: row is not accepted into the central repository until fixed.
- `warning`: row is accepted but flagged for AICTE review.

Each flag stores `rule_code`, a plain message, and `details_json` (for example, `{"approved": 120, "enrolled": 134}`).

## 4. Upload lifecycle

```
uploaded -> parsing -> validating -> (completed | completed_with_errors | failed)
```

1. File stored and parsed to rows.
2. Row-level rules run (format, fields, dates).
3. Database rules run (duplicates, cross-institution).
4. Aggregate rules run (intake, supernumerary).
5. Fuzzy matching and anomaly scoring run.
6. Valid rows are upserted to `students`. Flags are written to `validation_flags`.
7. Dashboard views refresh. An audit log entry is written.

Re-upload with fixes replaces rows from the same upload scope; resolved flags are marked `resolved = true`.

## 5. Verification and consent

1. Verifier submits APAAR ID (or scans a QR).
2. System creates a consent request and sends an OTP to the student (mock OTP in the demo).
3. Student OTP confirmed -> `consents` row created with expiry (for example, 15 minutes).
4. System returns a record: name (masked as needed), institution, course, status, academic year.
5. The record payload is signed with an Ed25519 private key. The QR encodes the payload and signature, and the public key is exposed at `/api/v1/verify/public-key`.
6. A `verifications` row and an `audit_logs` row are written.

## 6. Security and privacy

- HTTPS only; secrets in environment variables, never in git.
- Passwords hashed (bcrypt/argon2). JWT access tokens with a short expiry.
- All SQL parameterised through the ORM or bound parameters.
- PII masking on dashboards (show name initials and last digits of APAAR ID for non-verification views).
- Audit log for logins, uploads, queries, verifications, exports and assistant questions.
- The LLM only sees aggregated or masked data. It never receives raw student PII.
- Read-only database role for the text-to-SQL path.
- Rate limiting on login, OTP and verification endpoints.

## 7. Configuration (environment variables)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing key |
| `JWT_EXPIRE_MINUTES` | Access token lifetime |
| `APAAR_REGEX` | Valid APAAR ID pattern (default `^\d{12}$`) |
| `APAAR_MODE` | `mock` or `real` |
| `SIGNING_PRIVATE_KEY` | Ed25519 private key (PEM, base64) |
| `LLM_URL` | OpenAI-compatible base URL |
| `LLM_KEY` | LLM API key (`ollama` for local) |
| `LLM_MODEL` | `llama-3.1-8b-instant` (Groq) or `llama3.1:8b` (Ollama) |
| `FUZZY_THRESHOLD` | Name+DOB similarity cutoff (default 90) |
| `ANOMALY_THRESHOLD` | Score cutoff for `ANOMALY_HIGH` |
| `CORS_ORIGINS` | Allowed frontend origins |

## 8. Glossary

- **APAAR ID:** Automated Permanent Academic Account Registry, a national academic identity for students.
- **Supernumerary seats:** Seats over the approved intake that are allowed for specific categories.
- **NRI / OCI / FN:** Non-Resident Indian, Overseas Citizen of India, Foreign National.
- **Approved intake:** The seat count AICTE approves per course.
