"""Institution ERP integration (PRD F7, architecture.md integration row).

An institution admin stores the base URL + API key of their college's own
ERP portal. The platform then pulls the ERP's student roster and cross-checks
it against the records held here, so every APAAR verification is backed by
two independent sources.

ERP API contract (what we ask ERP vendors to expose)
----------------------------------------------------
GET  {erp_base_url}/students
Headers:
    Authorization: Bearer <api_key>
    Accept: application/json
200 response:
    {"students": [ { ...student object... }, ... ]}
    (a bare JSON array is also accepted)

Student object — one identity key (apaar_id, passport_no or student_code)
plus any of:
    apaar_id, passport_no, student_code, full_name, dob (YYYY-MM-DD),
    course, admission_date (YYYY-MM-DD), gender, category, quota_type,
    nationality

Special base URL ``mock://demo`` runs the cross-check against the local
database with deliberate drift (one dropped student, two field edits, one
ERP-only record), so the feature can be demonstrated without a real portal.
"""
import json
from base64 import urlsafe_b64encode
from datetime import date, datetime, timezone
from hashlib import sha256

import httpx
from cryptography.fernet import Fernet
from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Course, Student

# how many detail rows each section of the report may carry (payload cap)
MAX_MISSING = 25
MAX_MISMATCHES = 50

IDENTITY_FIELDS = ("apaar_id", "passport_no", "student_code")
COMPARE_FIELDS = ("full_name", "dob", "admission_date", "course",
                  "category", "quota_type", "nationality")


class ERPError(Exception):
    """Any problem talking to the ERP — message is safe to show the user."""


# --------------------------------------------------------------------------
# API key encryption at rest
# --------------------------------------------------------------------------
def _fernet() -> Fernet:
    """Key derived from the app's JWT secret — no extra env var needed."""
    return Fernet(urlsafe_b64encode(sha256(settings.jwt_secret.encode()).digest()))


def encrypt_key(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_key(enc: str) -> str:
    return _fernet().decrypt(enc.encode()).decode()


def mask_key(plain: str) -> str:
    """Show only the last 4 characters — like a credit card."""
    if not plain:
        return ""
    return "*" * 8 + plain[-4:]


def validate_base_url(url: str) -> str:
    """Normalise and sanity-check the ERP base URL."""
    url = (url or "").strip().rstrip("/")
    if not url:
        raise ValueError("ERP base URL is required")
    if len(url) > 500:
        raise ValueError("ERP base URL is too long (max 500 characters)")
    if url.startswith("mock://"):
        return url
    if not url.startswith(("http://", "https://")):
        raise ValueError("ERP base URL must start with http:// or https://")
    return url


# --------------------------------------------------------------------------
# Fetch the roster from the ERP
# --------------------------------------------------------------------------
def fetch_erp_students(
    base_url: str,
    api_key: str,
    db: Session | None = None,
    institution_id: int | None = None,
    timeout: float = 15.0,
) -> list[dict]:
    """GET {base_url}/students with the Bearer key. Raises ERPError."""
    if base_url.startswith("mock://"):
        if db is None or institution_id is None:
            raise ERPError("Mock ERP needs a database session")
        return _mock_erp_students(db, institution_id)

    url = f"{base_url}/students"
    try:
        resp = httpx.get(
            url,
            headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
            timeout=timeout,
        )
    except httpx.TimeoutException:
        raise ERPError(f"ERP did not respond within {timeout:.0f} seconds")
    except httpx.HTTPError as exc:
        raise ERPError(f"Could not reach the ERP portal ({exc.__class__.__name__})")

    if resp.status_code in (401, 403):
        raise ERPError(f"ERP rejected the API key (HTTP {resp.status_code})")
    if resp.status_code != 200:
        raise ERPError(f"ERP returned HTTP {resp.status_code} for /students")

    try:
        data = resp.json()
    except ValueError:
        raise ERPError("ERP returned a response that is not valid JSON")

    rows = data.get("students") if isinstance(data, dict) else data
    if not isinstance(rows, list):
        raise ERPError("ERP response is missing the 'students' array")
    return [r for r in rows if isinstance(r, dict)]


def _mock_erp_students(db: Session, institution_id: int) -> list[dict]:
    """Build a demo roster from local data with deliberate drift:
    first keyed student dropped (missing in ERP), rows 1-2 edited (field
    mismatches), plus one extra record that only the ERP knows about."""
    rows = db.execute(
        select(Student, Course)
        .join(Course, Student.course_id == Course.id)
        .where(Student.institution_id == institution_id)
        .order_by(Student.id)
    ).all()
    # only students that have an identity key can take part in matching
    rows = [(s, c) for s, c in rows if (s.apaar_id or s.passport_no or s.student_code)]
    if not rows:
        raise ERPError("No local students available to build the mock ERP roster")

    out: list[dict] = []
    for i, (s, c) in enumerate(rows):
        if i == 0:
            continue  # the ERP "lost" this student
        rec = {
            "apaar_id": s.apaar_id or "",
            "passport_no": s.passport_no or "",
            "student_code": s.student_code or "",
            "full_name": s.full_name,
            "dob": s.dob.isoformat() if s.dob else "",
            "course": c.name,
            "admission_date": s.admission_date.isoformat() if s.admission_date else "",
            "category": s.category,
            "quota_type": s.quota_type,
            "nationality": s.nationality,
        }
        if i == 1:
            rec["dob"] = "2000-01-01"  # date of birth differs
        if i == 2:
            rec["full_name"] = f"{rec['full_name']} Kumar"  # name differs
        out.append(rec)

    out.append({
        "apaar_id": "999900099990",
        "student_code": "ERP-ONLY-001",
        "full_name": "Ghost Student",
        "dob": "2005-06-01",
        "course": rows[0][1].name,
        "admission_date": "2026-07-01",
        "category": "GENERAL",
        "quota_type": "regular",
        "nationality": "INDIAN",
    })
    return out


# --------------------------------------------------------------------------
# Cross-check ERP roster against local records
# --------------------------------------------------------------------------
def _norm(value) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _as_date(value) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value).strip()[:10])
    except ValueError:
        return None


def _identity(row: dict) -> str | None:
    """Match key: APAAR first, then passport, then roll number."""
    for f in IDENTITY_FIELDS:
        v = str(row.get(f) or "").strip()
        if v:
            return f"{f}:{v.lower()}"
    return None


def _mask(value: str | None) -> str:
    if not value:
        return "XXXXXXXX"
    return "XXXXXXXX" + value[-4:] if len(value) >= 4 else "XXXXXXXX"


def cross_check(db: Session, institution_id: int, erp_rows: list[dict]) -> dict:
    """Compare the ERP roster with local students; return a JSON-safe report."""
    local_rows = db.execute(
        select(Student, Course)
        .join(Course, Student.course_id == Course.id)
        .where(Student.institution_id == institution_id)
    ).all()

    local_by_key: dict[str, tuple[Student, Course]] = {}
    for s, c in local_rows:
        key = _identity({
            "apaar_id": s.apaar_id, "passport_no": s.passport_no,
            "student_code": s.student_code,
        })
        if key:
            local_by_key[key] = (s, c)

    erp_by_key: dict[str, dict] = {}
    for row in erp_rows:
        key = _identity(row)
        if key:
            erp_by_key[key] = row

    matched_keys = set(local_by_key) & set(erp_by_key)

    missing_in_erp = [
        {
            "apaar_id_masked": _mask(s.apaar_id or s.passport_no),
            "full_name": s.full_name,
            "student_code": s.student_code,
            "course": c.name,
        }
        for key, (s, c) in local_by_key.items()
        if key not in erp_by_key
    ]

    missing_in_local = [
        {
            "apaar_id_masked": _mask(str(r.get("apaar_id") or r.get("passport_no") or "")),
            "full_name": str(r.get("full_name") or ""),
            "course": str(r.get("course") or ""),
            "student_code": str(r.get("student_code") or ""),
        }
        for key, r in erp_by_key.items()
        if key not in local_by_key
    ]

    mismatches: list[dict] = []
    verified_apaar = 0
    for key in sorted(matched_keys):
        s, c = local_by_key[key]
        erp = erp_by_key[key]
        if s.apaar_id and str(erp.get("apaar_id") or "").strip() == s.apaar_id:
            verified_apaar += 1

        local_values = {
            "full_name": s.full_name,
            "dob": s.dob.isoformat() if s.dob else "",
            "admission_date": s.admission_date.isoformat() if s.admission_date else "",
            "course": c.name,
            "category": s.category,
            "quota_type": s.quota_type,
            "nationality": s.nationality,
        }
        for field in COMPARE_FIELDS:
            erp_raw = erp.get(field)
            if erp_raw in (None, ""):
                continue  # ERP didn't send this field — nothing to compare
            local_raw = local_values[field]
            if field in ("dob", "admission_date", "course"):
                equal = (
                    _as_date(erp_raw) == _as_date(local_raw)
                    if field != "course"
                    else fuzz.ratio(_norm(erp_raw), _norm(local_raw)) >= 90
                )
            else:
                equal = _norm(erp_raw) == _norm(local_raw)
            if not equal:
                mismatches.append({
                    "apaar_id_masked": _mask(s.apaar_id or s.passport_no),
                    "full_name": s.full_name,
                    "field": field,
                    "local": str(local_raw or "(missing)"),
                    "erp": str(erp_raw),
                })

    report = {
        "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "erp_records": len(erp_rows),
        "local_records": len(local_rows),
        "matched": len(matched_keys),
        "verified_apaar": verified_apaar,
        "missing_in_erp_count": len(missing_in_erp),
        "missing_in_local_count": len(missing_in_local),
        "field_mismatches_count": len(mismatches),
        "missing_in_erp": missing_in_erp[:MAX_MISSING],
        "missing_in_local": missing_in_local[:MAX_MISSING],
        "field_mismatches": mismatches[:MAX_MISMATCHES],
    }
    report["summary"] = (
        f"{len(matched_keys)} of {len(local_rows)} local records matched in the ERP · "
        f"{len(missing_in_erp)} missing in ERP · "
        f"{len(missing_in_local)} only in ERP · "
        f"{len(mismatches)} field mismatches"
    )
    return report


def dumps_result(report: dict) -> str:
    return json.dumps(report, ensure_ascii=False)
