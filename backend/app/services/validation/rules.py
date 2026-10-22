"""Row-level validation rules (backend_guide.md §6.1, system.md §3).

Each rule returns (rule_code, severity, message) tuples. Severities:
  error   -> row is not accepted until fixed
  warning -> row accepted but flagged for AICTE review
"""
import re
from datetime import date

from app.config import settings

APAAR_RE = re.compile(settings.apaar_regex)
CATEGORIES = {"GENERAL", "OBC", "SC", "ST", "EWS", "OTHER"}
QUOTAS = {"regular", "supernumerary", "nri", "oci", "fn"}


def row_flags(row: dict, academic_year_start: date, academic_year_end: date):
    """Validate a single normalised row. Returns list of (code, severity, message)."""
    flags = []

    # --- APAAR ID ------------------------------------------------------
    apaar = (row.get("apaar_id") or "").strip()
    if not apaar:
        flags.append(("APAAR_MISSING", "error", "APAAR ID is missing"))
    elif not APAAR_RE.match(apaar):
        flags.append(("APAAR_FORMAT", "error", "APAAR ID format is invalid"))

    # --- required fields ----------------------------------------------
    for f in ("full_name", "dob", "course", "quota_type", "admission_date"):
        if not row.get(f):
            flags.append(("FIELD_MISSING", "error", f"{f} is required"))

    # --- plausibility ---------------------------------------------------
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

    # --- quota vs nationality -------------------------------------------
    q, nat = row.get("quota_type"), (row.get("nationality") or "").upper()
    if q in {"nri", "oci", "fn"} and nat == "INDIAN" and q != "nri":
        flags.append(("QUOTA_NATIONALITY_MISMATCH", "warning",
                      f"Quota {q} does not match nationality {nat}"))
    return flags


def academic_year_window(academic_year: str) -> tuple[date, date]:
    """'2026-27' -> (2026-04-01, 2027-03-31)."""
    start_year = int(academic_year.split("-")[0])
    return date(start_year, 4, 1), date(start_year + 1, 3, 31)
