# Backend Guide (FastAPI)

Rule codes, tables, roles and env vars are defined in `system.md`. Folder layout is in `architecture.md`.

---

## 1. Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn[standard] sqlalchemy psycopg2-binary pydantic-settings \
            pandas openpyxl python-jose[cryptography] passlib[bcrypt] python-multipart \
            scikit-learn rapidfuzz cryptography qrcode[pil] openai faker pytest httpx
pip freeze > requirements.txt
```

`.env` (never commit):

```
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=change-me
JWT_EXPIRE_MINUTES=60
APAAR_REGEX=^\d{12}$
APAAR_MODE=mock
SIGNING_PRIVATE_KEY=<base64 PEM>
LLM_URL=https://api.groq.com/openai/v1
LLM_KEY=<groq key>
LLM_MODEL=llama-3.1-8b-instant
FUZZY_THRESHOLD=90
ANOMALY_THRESHOLD=0.65
CORS_ORIGINS=http://localhost:5173
```

Run: `uvicorn app.main:app --reload`

## 2. Config

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 60
    apaar_regex: str = r"^\d{12}$"
    apaar_mode: str = "mock"
    signing_private_key: str = ""
    llm_url: str = "http://localhost:11434/v1"
    llm_key: str = "ollama"
    llm_model: str = "llama3.1:8b"
    fuzzy_threshold: int = 90
    anomaly_threshold: float = 0.65
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()
```

## 3. Database

Create tables from the model in `system.md` section 2 (SQLAlchemy models or plain SQL). Add indexes:

```sql
CREATE INDEX idx_students_apaar ON students(apaar_id);
CREATE INDEX idx_students_inst_course ON students(institution_id, course_id);
CREATE UNIQUE INDEX uq_active_enrolment
  ON students(apaar_id, institution_id, course_id)
  WHERE status IN ('valid','flagged');
CREATE INDEX idx_flags_upload ON validation_flags(upload_id);
```

Views used by dashboards and the LLM:

```sql
CREATE VIEW v_course_intake_status AS
SELECT i.id AS institution_id, i.name AS institution, i.state,
       c.id AS course_id, c.name AS course, c.academic_year,
       c.approved_intake, c.approved_supernumerary,
       COUNT(s.id) AS enrolled,
       COUNT(*) FILTER (WHERE s.quota_type = 'supernumerary') AS supernumerary_enrolled,
       COUNT(s.id) - (c.approved_intake + c.approved_supernumerary) AS excess
FROM courses c
JOIN institutions i ON i.id = c.institution_id
LEFT JOIN students s ON s.course_id = c.id AND s.status IN ('valid','flagged')
GROUP BY i.id, i.name, i.state, c.id, c.name, c.academic_year,
         c.approved_intake, c.approved_supernumerary;

CREATE VIEW v_duplicate_enrolments AS
SELECT 'XXXXXXXX' || RIGHT(apaar_id, 4) AS apaar_id_masked,
       COUNT(DISTINCT institution_id) AS institutions
FROM students WHERE status IN ('valid','flagged')
GROUP BY apaar_id HAVING COUNT(DISTINCT institution_id) > 1;

CREATE VIEW v_flag_summary AS
SELECT i.name AS institution, i.state, f.rule_code, f.severity,
       COUNT(*) AS flag_count
FROM validation_flags f
JOIN uploads u ON u.id = f.upload_id
JOIN institutions i ON i.id = u.institution_id
WHERE f.resolved = false
GROUP BY i.name, i.state, f.rule_code, f.severity;

CREATE VIEW v_institution_summary AS
SELECT i.id AS institution_id, i.name AS institution, i.state,
       COUNT(s.id) AS total_students,
       COUNT(*) FILTER (WHERE s.status = 'flagged') AS flagged_students,
       COALESCE(MAX(a.score), 0) AS anomaly_score
FROM institutions i
LEFT JOIN students s ON s.institution_id = i.id
LEFT JOIN anomaly_scores a ON a.institution_id = i.id
GROUP BY i.id, i.name, i.state;
```

Create a read-only role for the assistant:

```sql
CREATE ROLE llm_reader LOGIN PASSWORD '...';
GRANT SELECT ON v_institution_summary, v_course_intake_status,
                v_flag_summary, v_duplicate_enrolments TO llm_reader;
```

## 4. Auth and RBAC

```python
# app/auth/rbac.py
from fastapi import Depends, HTTPException
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from app.config import settings

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def current_user(token: str = Depends(oauth2)):
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(401, "Invalid token")

def require_roles(*roles):
    def checker(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Forbidden")
        return user
    return checker
```

JWT payload: `{sub, role, institution_id, exp}`. For institution users, always filter by `user["institution_id"]`.

## 5. API endpoints

Base path: `/api/v1`

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public | Returns JWT |
| POST | `/uploads` | institution_admin | Upload CSV/Excel, returns summary |
| GET | `/uploads/{id}` | institution_admin, aicte_* | Upload status and counts |
| GET | `/uploads/{id}/flags` | institution_admin, aicte_* | Per-row errors/warnings |
| POST | `/students` | institution_admin | Add or update students (JSON bulk) |
| GET | `/students` | institution_admin, aicte_* | Search/list (scoped, masked) |
| GET | `/dashboard/overview` | aicte_* | Totals, flags, states |
| GET | `/dashboard/intake` | aicte_*, institution_admin | Intake vs enrolled |
| GET | `/dashboard/duplicates` | aicte_* | Cross-institution duplicates |
| GET | `/dashboard/anomalies` | aicte_* | Scores and reasons |
| GET | `/dashboard/categories` | aicte_* | NRI/OCI/FN/supernumerary breakdown |
| POST | `/assistant/explain` | institution_admin, aicte_* | LLM explanation of flags |
| POST | `/assistant/query` | aicte_* | Natural language question |
| POST | `/assistant/summary` | aicte_* | Report summary from computed numbers |
| POST | `/verify/request` | verifier | Start verification, sends OTP |
| POST | `/verify/confirm` | verifier | Submit OTP, returns signed record |
| POST | `/verify/check` | public | Validate a payload and signature |
| GET | `/verify/public-key` | public | Public key for offline check |
| GET | `/reports/{type}` | aicte_* | PDF or Excel export |

## 6. Validation engine

### 6.1 Row rules

```python
# app/services/validation/rules.py
import re
from datetime import date
from app.config import settings

APAAR_RE = re.compile(settings.apaar_regex)
CATEGORIES = {"GENERAL", "OBC", "SC", "ST", "EWS", "OTHER"}
QUOTAS = {"regular", "supernumerary", "nri", "oci", "fn"}

def row_flags(row: dict, academic_year_start: date, academic_year_end: date):
    flags = []
    apaar = (row.get("apaar_id") or "").strip()
    foreign = row.get("quota_type") in {"nri", "oci", "fn"}  # passport holders
    if foreign:
        if not re.fullmatch(r"[A-Z]\d{7}", (row.get("passport_no") or "").strip()):
            flags.append(("PASSPORT_FORMAT", "error", "Valid passport number is required"))
    elif not apaar:
        flags.append(("APAAR_MISSING", "error", "APAAR ID is missing"))
    elif not APAAR_RE.match(apaar):
        flags.append(("APAAR_FORMAT", "error", "APAAR ID format is invalid"))

    for f in ("full_name", "dob", "course", "quota_type", "admission_date"):
        if not row.get(f):
            flags.append(("FIELD_MISSING", "error", f"{f} is required"))

    dob = row.get("dob")
    if dob and (dob > date.today() or (date.today().year - dob.year) < 14
                or (date.today().year - dob.year) > 60):
        flags.append(("DOB_INVALID", "error", "Date of birth is implausible"))

    adm = row.get("admission_date")
    if adm and not (academic_year_start <= adm <= academic_year_end):
        flags.append(("ADMISSION_DATE_INVALID", "error",
                      "Admission date is outside the academic year"))

    if row.get("category") and row["category"].upper() not in CATEGORIES:
        flags.append(("CATEGORY_INVALID", "error", "Unknown category"))

    q, nat = row.get("quota_type"), (row.get("nationality") or "").upper()
    if q in {"nri", "oci", "fn"} and nat == "INDIAN" and q != "nri":
        flags.append(("QUOTA_NATIONALITY_MISMATCH", "warning",
                      f"Quota {q} does not match nationality {nat}"))
    return flags
```

### 6.2 Database and aggregate rules

Order of checks inside `engine.py`:

1. Parse the file to a DataFrame and normalise columns and dates.
2. Row rules for every row.
3. `DUP_IN_UPLOAD`: `df[df.duplicated("apaar_id", keep=False)]`.
4. `DUP_IN_INSTITUTION` and `DUP_CROSS_INSTITUTION`: one query using `apaar_id = ANY(:ids)`; do not query per row.
5. Optional `APAAR_NOT_FOUND` via the adapter (batch call if possible).
6. Fuzzy matching (see `aiml_guide.md`).
7. Aggregate: count rows per course, add existing enrolled count, compare to `approved_intake + approved_supernumerary` -> `INTAKE_EXCEEDED`, and supernumerary count against `approved_supernumerary` -> `SUPERNUMERARY_EXCEEDED`.
8. Persist: valid rows upserted, all flags inserted with `upload_id` and `row_number`.

Return a summary like:

```json
{"upload_id": 12, "total": 500, "valid": 471, "errors": 22, "warnings": 7,
 "by_rule": {"APAAR_FORMAT": 9, "DUP_CROSS_INSTITUTION": 6, "INTAKE_EXCEEDED": 1}}
```

### 6.3 APAAR adapter

```python
# app/services/apaar_client.py
class APAARClient:
    def exists(self, apaar_id: str) -> bool: ...

class MockAPAARClient(APAARClient):
    # Treat IDs from the synthetic registry table as valid
    def __init__(self, known_ids: set[str]): self.known = known_ids
    def exists(self, apaar_id): return apaar_id in self.known

def get_client():
    # return RealAPAARClient() when settings.apaar_mode == "real"
    ...
```

## 7. Upload endpoint

```python
@router.post("/uploads")
async def upload(file: UploadFile, user=Depends(require_roles("institution_admin")),
                 db=Depends(get_db)):
    df = parse_file(file)                      # csv/xlsx -> DataFrame
    result = run_validation(df, user["institution_id"], db)
    audit(db, user, "UPLOAD", "uploads", result["upload_id"])
    return result
```

Limits: max file size (for example 10 MB), allowed extensions `.csv`, `.xlsx`, and a required column check. Reject uploads with missing required columns with a clear message and a downloadable template.

## 8. Verification service

```python
# app/services/verification/signing.py
import base64, json
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

def sign(payload: dict, private_key: Ed25519PrivateKey) -> str:
    data = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(private_key.sign(data)).decode()

def verify(payload: dict, signature: str, public_key) -> bool:
    data = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    try:
        public_key.verify(base64.urlsafe_b64decode(signature), data)
        return True
    except Exception:
        return False
```

Record payload example:

```json
{"apaar_id": "XXXXXXXX1234", "institution": "ABC College of Engineering",
 "course": "B.Tech Computer Engineering", "academic_year": "2026-27",
 "status": "ENROLLED", "issued_at": "2026-10-22T14:30:00Z"}
```

QR: encode `{"payload": ..., "sig": ...}` with the `qrcode` library and return a PNG or data URL.

Consent flow:
- `/verify/request`: create a `consents` row with `otp_hash`, `expires_at` (15 minutes), and return `consent_id` plus the OTP (demo delivery).
- `/verify/confirm`: check OTP, mark consent granted, build and sign the payload, store the `verifications` row.
- Rate limit OTP attempts (for example, 5 per consent).

## 9. Audit logging

Write an `audit_logs` row for: login, upload, student edit, dashboard export, assistant query, verification request and confirm. Use a small helper `audit(db, user, action, resource, resource_id)` and call it in each router. Never log OTPs, passwords, or full PII.

## 10. Reports

- Excel via `pandas.DataFrame.to_excel` (openpyxl).
- PDF via `reportlab` or by rendering HTML with `weasyprint` (optional).
- Report types: `intake-breach`, `duplicates`, `category-summary`, `state-wise`, `anomalies`.
- Optionally pass the computed numbers to `/assistant/summary` for a narrative paragraph.

## 11. Testing

- Unit tests for each rule with good and bad rows.
- A fixture CSV with one known case per rule code and an assertion that exactly those codes appear.
- RBAC tests: an institution user cannot read another institution's data (expect 403 or empty result).
- Signing tests: tampered payload must fail `verify`.
- SQL guard tests (see `aiml_guide.md`).

## 12. Deployment (Render)

`Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

`render.yaml`:

```yaml
services:
  - type: web
    name: apaar-backend
    runtime: docker
    plan: free
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: LLM_URL
        value: https://api.groq.com/openai/v1
      - key: LLM_MODEL
        value: llama-3.1-8b-instant
      - key: LLM_KEY
        sync: false
      - key: CORS_ORIGINS
        sync: false
```

Free Render services sleep when idle, so open the URL a few minutes before the demo.

## 13. Build order

1. Config, DB, models, seed script (with `aiml_guide.md` synthetic data).
2. Auth and RBAC.
3. Row rules, then DB and aggregate rules, then the upload endpoint.
4. Dashboard endpoints from views.
5. Fuzzy matching and anomaly scoring.
6. Verification (consent, signing, QR).
7. Assistant endpoints.
8. Reports, audit polish, tests, deployment.
