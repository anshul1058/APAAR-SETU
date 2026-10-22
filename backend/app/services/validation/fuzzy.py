"""Fuzzy duplicate detection (backend_guide.md §6.2 step 6, aiml_guide.md).

Flags a row as FUZZY_DUPLICATE (warning) when the student's name+DOB closely
matches an existing active student with a DIFFERENT APAAR ID — this catches
people hiding duplicates behind a freshly issued APAAR number.
"""
from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import STATUS_FLAGGED, STATUS_VALID, Institution, Student


def apply(db: Session, rows: list[dict], per_row_flags: list, upload, academic_year: str) -> int:
    """Compare each parsed row against active students sharing the same DOB.

    Appends (FUZZY_DUPLICATE, warning, message) to per_row_flags in place.
    Returns the number of fuzzy matches found.
    """
    candidates = db.execute(
        select(Student.full_name, Student.apaar_id, Student.dob, Institution.name)
        .join(Institution, Institution.id == Student.institution_id)
        .where(Student.status.in_([STATUS_VALID, STATUS_FLAGGED]))
        .where(Student.dob.isnot(None))
    ).all()

    # index existing students by DOB for O(rows) lookups
    by_dob: dict[str, list] = {}
    for name, apaar, dob, inst_name in candidates:
        by_dob.setdefault(dob.isoformat(), []).append((name, apaar, inst_name))

    matches = 0
    for i, row in enumerate(rows):
        dob, name = row.get("dob"), (row.get("full_name") or "").strip()
        if not dob or not name:
            continue
        for ex_name, ex_apaar, inst_name in by_dob.get(dob.isoformat(), []):
            if ex_apaar == row.get("apaar_id"):
                continue  # same person, same id — handled by DUP_* rules
            score = fuzz.token_set_ratio(name.lower(), (ex_name or "").lower())
            if score >= settings.fuzzy_threshold:
                ref = f"APAAR ...{ex_apaar[-4:]}" if ex_apaar else "no APAAR ID"
                per_row_flags[i].append((
                    "FUZZY_DUPLICATE", "warning",
                    f"Name is {score:.0f}% similar to an active student in {inst_name} "
                    f"({ref})",
                ))
                matches += 1
                break  # one warning per row is enough
    return matches
