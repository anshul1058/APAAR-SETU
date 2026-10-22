"""Dashboard endpoints (backend_guide.md §5) — read from the SQL views (§3).

Roles:
  * aicte_officer / aicte_admin -> all institutions
  * institution_admin           -> only own institution (intake view only)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.rbac import require_roles
from app.db import get_db
from app.models import AnomalyScore

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

AICTE = ("aicte_officer", "aicte_admin")
AICTE_OR_INST = ("aicte_officer", "aicte_admin", "institution_admin")


def _rows(db: Session, sql: str, params: dict | None = None) -> list[dict]:
    result = db.execute(text(sql), params or {})
    return [dict(r) for r in result.mappings()]


@router.get("/overview")
def overview(
    user: dict = Depends(require_roles(*AICTE)),
    db: Session = Depends(get_db),
):
    """Totals, flag breakdown and state-wise student counts."""
    institutions = _rows(db, "SELECT COUNT(*) AS n FROM institutions")[0]["n"]
    students = _rows(
        db,
        "SELECT COUNT(*) AS n FROM students WHERE status IN ('valid','flagged')",
    )[0]["n"]
    flagged = _rows(
        db, "SELECT COUNT(*) AS n FROM students WHERE status = 'flagged'"
    )[0]["n"]
    by_state = _rows(db, """
        SELECT state, COUNT(*) AS students
        FROM v_institution_summary
        GROUP BY state ORDER BY students DESC
    """)
    flags = _rows(db, """
        SELECT rule_code, severity, SUM(flag_count) AS count
        FROM v_flag_summary GROUP BY rule_code, severity
        ORDER BY count DESC
    """)
    dupes = _rows(db, "SELECT COUNT(*) AS n FROM v_duplicate_enrolments")[0]["n"]
    return {
        "institutions": institutions,
        "students": students,
        "flagged_students": flagged,
        "cross_institution_duplicates": dupes,
        "by_state": by_state,
        "flags_by_rule": flags,
    }


@router.get("/intake")
def intake(
    user: dict = Depends(require_roles(*AICTE_OR_INST)),
    db: Session = Depends(get_db),
):
    """Approved intake vs enrolled per course (v_course_intake_status)."""
    params = {}
    scope = ""
    if user["role"] == "institution_admin":
        if not user.get("institution_id"):
            raise HTTPException(403, "No institution bound to this user")
        scope = "WHERE institution_id = :iid"
        params = {"iid": user["institution_id"]}
    return _rows(db, f"""
        SELECT institution, state, course, academic_year,
               approved_intake, approved_supernumerary,
               enrolled, supernumerary_enrolled, excess
        FROM v_course_intake_status {scope}
        ORDER BY excess DESC, institution
    """, params)


@router.get("/duplicates")
def duplicates(
    user: dict = Depends(require_roles(*AICTE)),
    db: Session = Depends(get_db),
):
    """Cross-institution duplicate enrolments (masked APAAR ids)."""
    return _rows(db, """
        SELECT apaar_id_masked, institutions
        FROM v_duplicate_enrolments ORDER BY institutions DESC
    """)


@router.get("/anomalies")
def anomalies(
    user: dict = Depends(require_roles(*AICTE)),
    db: Session = Depends(get_db),
):
    """Anomaly scores and reasons (computed in Phase 5)."""
    from app.models import Course, Institution

    scores = db.query(AnomalyScore).order_by(AnomalyScore.score.desc()).limit(200).all()
    out = []
    for a in scores:
        inst = db.get(Institution, a.institution_id)
        course = db.get(Course, a.course_id) if a.course_id else None
        out.append({
            "institution": inst.name if inst else None,
            "state": inst.state if inst else None,
            "course": course.name if course else None,
            "academic_year": a.academic_year,
            "score": a.score,
            "reasons": a.reasons_json,
        })
    return out


@router.get("/categories")
def categories(
    user: dict = Depends(require_roles(*AICTE)),
    db: Session = Depends(get_db),
):
    """NRI/OCI/FN and supernumerary breakdown across active students."""
    quota = _rows(db, """
        SELECT quota_type, COUNT(*) AS count FROM students
        WHERE status IN ('valid','flagged')
        GROUP BY quota_type ORDER BY count DESC
    """)
    category = _rows(db, """
        SELECT category, COUNT(*) AS count FROM students
        WHERE status IN ('valid','flagged')
        GROUP BY category ORDER BY count DESC
    """)
    nationality = _rows(db, """
        SELECT nationality, COUNT(*) AS count FROM students
        WHERE status IN ('valid','flagged')
        GROUP BY nationality ORDER BY count DESC
    """)
    return {"by_quota": quota, "by_category": category, "by_nationality": nationality}
