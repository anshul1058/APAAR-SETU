"""Validation engine (backend_guide.md §6.2).

Order of checks:
  1. rows already parsed/normalised by parser.parse_file
  2. row rules for every row
  3. DUP_IN_UPLOAD
  4. DUP_IN_INSTITUTION + DUP_CROSS_INSTITUTION (ONE batched query)
  5. APAAR_NOT_FOUND via the adapter (batch)
  6. fuzzy matching (hook — implemented in fuzzy.py, Phase 5)
  7. aggregate rules: INTAKE_EXCEEDED, SUPERNUMERARY_EXCEEDED
  8. persist: accepted rows upserted, all flags inserted

Counts in the summary:
  valid   = rows with zero error flags (may carry warnings)
  errors  = rows with >=1 error flag (not accepted)
  warnings= accepted rows carrying >=1 warning
"""
import json
from collections import Counter
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Course,
    STATUS_FLAGGED,
    STATUS_VALID,
    Student,
    Upload,
    ValidationFlag,
)
from app.services import apaar_client
from app.services.validation import rules as row_rules

# academic year the platform currently operates on (per course rows carry their own year)
DEFAULT_ACADEMIC_YEAR = "2026-27"


def _batch_db_duplicates(db: Session, apaar_ids: set[str], academic_year: str):
    """ONE query for ALL uploaded APAAR ids (never per-row).

    Returns [(apaar_id, institution_id, academic_year), ...] of active
    enrolments matching any uploaded APAAR ID.
    """
    if not apaar_ids:
        return []
    return db.execute(
        select(Student.apaar_id, Student.institution_id, Course.academic_year)
        .join(Course, Course.id == Student.course_id)
        .where(Student.apaar_id.in_(list(apaar_ids)))
        .where(Student.status.in_([STATUS_VALID, STATUS_FLAGGED]))
    ).all()


def run_validation(
    rows: list[dict],
    institution_id: int,
    db: Session,
    uploaded_by: int | None = None,
    filename: str = "upload",
    academic_year: str = DEFAULT_ACADEMIC_YEAR,
) -> dict:
    """Execute the full pipeline and persist results. Returns the summary dict."""
    ay_start, ay_end = row_rules.academic_year_window(academic_year)

    upload = Upload(
        institution_id=institution_id,
        filename=filename,
        status="validating",
        uploaded_by=uploaded_by,
        total_rows=len(rows),
    )
    db.add(upload)
    db.flush()

    # row flags per (row index) ------------------------------------------------
    per_row_flags: list[list[tuple]] = [
        row_rules.row_flags(row, ay_start, ay_end) for row in rows
    ]

    # step 3: DUP_IN_UPLOAD -----------------------------------------------------
    # only well-formed IDs participate: two rows both containing '123' are two
    # malformed rows, not the same student enrolled twice (they already carry
    # APAAR_FORMAT from step 1)
    seen: dict[str, int] = {}
    for i, row in enumerate(rows):
        apaar = row.get("apaar_id") or ""
        if not apaar or not row_rules.APAAR_RE.match(apaar):
            continue
        if apaar in seen:
            per_row_flags[i].append((
                "DUP_IN_UPLOAD", "error",
                f"APAAR ID also appears in row {seen[apaar] + 1} of this file",
            ))
        else:
            seen[apaar] = i + 1  # 1-based data row number

    # step 4: DB duplicates (single batched query) -----------------------------
    existing = _batch_db_duplicates(db, set(seen), academic_year)
    by_apaar: dict[str, list[tuple[str, int, str]]] = {}
    for aid, inst_id, year in existing:
        by_apaar.setdefault(aid, []).append((aid, inst_id, year))

    course_lookup = {
        c.name.lower().strip(): c
        for c in db.execute(
            select(Course).where(Course.institution_id == institution_id)
            .where(Course.academic_year == academic_year)
        ).scalars()
    }

    for i, row in enumerate(rows):
        apaar = row.get("apaar_id") or ""
        for _, inst_id, year in by_apaar.get(apaar, []):
            if year != academic_year:
                continue  # only same-year enrolments conflict
            if inst_id == institution_id:
                per_row_flags[i].append((
                    "DUP_IN_INSTITUTION", "error",
                    "APAAR ID is already enrolled in this institution for this year",
                ))
            else:
                per_row_flags[i].append((
                    "DUP_CROSS_INSTITUTION", "error",
                    "APAAR ID is active in another institution for this year",
                ))

    # step 5: APAAR registry existence (batch) ---------------------------------
    client = apaar_client.get_client(db)
    for i, row in enumerate(rows):
        apaar = row.get("apaar_id") or ""
        if apaar and not client.exists(apaar):
            per_row_flags[i].append((
                "APAAR_NOT_FOUND", "error",
                "APAAR ID does not exist in the national registry",
            ))

    # step 6: fuzzy matching (Phase 5 hook — no-op until fuzzy.py is wired) -----
    try:
        from app.services.validation import fuzzy
        fuzzy.apply(db, rows, per_row_flags, upload, academic_year)
    except ImportError:
        pass

    # resolve course matching -----------------------------------------------------------------
    course_for_row: list[Course | None] = []
    for i, row in enumerate(rows):
        course = course_lookup.get((row.get("course") or "").lower().strip())
        course_for_row.append(course)
        if course is None and row.get("course"):
            per_row_flags[i].append((
                "FIELD_MISSING", "error",
                f"course '{row['course']}' is not an approved course of this institution "
                f"for {academic_year}",
            ))

    # step 7: aggregate rules (INTAKE_EXCEEDED / SUPERNUMERARY_EXCEEDED) -------------------------
    accepted_rows = [
        i for i in range(len(rows))
        if not any(sev == "error" for _, sev, _ in per_row_flags[i])
    ]
    aggregate_flags: list[tuple] = []  # (course, code, severity, message, details)
    for course in course_lookup.values():
        incoming = [i for i in accepted_rows if course_for_row[i] is course]
        existing_enrolled = db.execute(
            select(Student).where(Student.course_id == course.id)
            .where(Student.status.in_([STATUS_VALID, STATUS_FLAGGED]))
        ).scalars().all()
        existing_count = len(existing_enrolled)
        existing_supernum = sum(1 for s in existing_enrolled if s.quota_type == "supernumerary")
        new_supernum = sum(1 for i in incoming if rows[i].get("quota_type") == "supernumerary")

        total = existing_count + len(incoming)
        approved = course.approved_intake + course.approved_supernumerary
        if total > approved:
            aggregate_flags.append((
                course, "INTAKE_EXCEEDED", "error",
                f"Enrolled ({total}) exceeds approved intake "
                f"({course.approved_intake} + {course.approved_supernumerary})",
                {"approved": approved, "enrolled": total},
            ))
        supernum_total = existing_supernum + new_supernum
        if supernum_total > course.approved_supernumerary:
            aggregate_flags.append((
                course, "SUPERNUMERARY_EXCEEDED", "error",
                f"Supernumerary admits ({supernum_total}) exceed approved "
                f"supernumerary seats ({course.approved_supernumerary})",
                {"approved_supernumerary": course.approved_supernumerary,
                 "supernumerary_enrolled": supernum_total},
            ))

    # step 8: persist ------------------------------------------------------------------------------------
    errors_rows = 0
    warnings_rows = 0
    by_rule: Counter[str] = Counter()

    for i, row in enumerate(rows):
        row_number = i + 1
        has_error = any(sev == "error" for _, sev, _ in per_row_flags[i])
        has_warning = any(sev == "warning" for _, sev, _ in per_row_flags[i])
        course = course_for_row[i]

        student_id = None
        if not has_error and course is not None:
            status = STATUS_FLAGGED if has_warning else STATUS_VALID
            # Indian rows key on apaar_id; foreign rows on passport_no (their
            # primary id — a NULL-apaar match would hit any student in the course)
            apaar = row["apaar_id"] or None
            passport = (row.get("passport_no") or "").strip().upper() or None
            match = [
                Student.institution_id == institution_id,
                Student.course_id == course.id,
                Student.apaar_id == apaar if apaar else Student.passport_no == passport,
            ]
            student = db.execute(
                select(Student).where(*match)
            ).scalar_one_or_none()
            if student is None:
                student = Student(
                    apaar_id=apaar,
                    passport_no=passport,
                    institution_id=institution_id,
                    course_id=course.id,
                    status=status,
                )
                db.add(student)
            student.student_code = row.get("student_code") or ""
            student.full_name = row.get("full_name") or ""
            student.dob = row.get("dob")
            student.gender = row.get("gender") or ""
            student.category = (row.get("category") or "GENERAL")
            student.quota_type = row.get("quota_type") or "regular"
            student.nationality = row.get("nationality") or "INDIAN"
            student.admission_date = row.get("admission_date")
            student.email_hash = str(row.get("email") or "")
            student.status = status
            student.source_upload_id = upload.id
            db.flush()
            student_id = student.id

        if has_error:
            errors_rows += 1
        elif has_warning:
            warnings_rows += 1

        for code, severity, message in per_row_flags[i]:
            by_rule[code] += 1
            db.add(ValidationFlag(
                upload_id=upload.id, student_id=student_id, row_number=row_number,
                rule_code=code, severity=severity, message=message,
            ))

    # aggregate flags attach to no row (row_number NULL)
    for course, code, severity, message, details in aggregate_flags:
        by_rule[code] += 1
        db.add(ValidationFlag(
            upload_id=upload.id, student_id=None, row_number=None,
            rule_code=code, severity=severity, message=f"{course.name}: {message}",
            details_json=json.dumps(details),
        ))

    upload.valid_rows = len(accepted_rows)
    upload.invalid_rows = errors_rows
    upload.status = "completed_with_errors" if errors_rows else "completed"
    db.flush()

    return {
        "upload_id": upload.id,
        "total": len(rows),
        "valid": len(accepted_rows),
        "errors": errors_rows,
        "warnings": warnings_rows,
        "by_rule": dict(by_rule),
    }
