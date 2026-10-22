"""Report export endpoints (backend_guide.md §10).

GET /reports/{type} -> Excel workbook (openpyxl). Types:
  intake-breach, duplicates, category-summary, state-wise, anomalies
"""
import io
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.audit import audit
from app.auth.rbac import require_roles
from app.db import get_db
from app.models import AnomalyScore

router = APIRouter(prefix="/reports", tags=["reports"])

AICTE = ("aicte_officer", "aicte_admin")


def _excel_response(df_map: dict[str, pd.DataFrame], filename: str) -> Response:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        for sheet, df in df_map.items():
            df.to_excel(writer, sheet_name=sheet[:31], index=False)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _rows(db: Session, sql: str) -> pd.DataFrame:
    return pd.DataFrame([dict(r) for r in db.execute(text(sql)).mappings().all()])


@router.get("/{report_type}")
def report(
    report_type: str,
    request: Request = None,
    user: dict = Depends(require_roles(*AICTE)),
    db: Session = Depends(get_db),
):
    """Generate one of the standard AICTE reports as Excel."""
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")

    if report_type == "intake-breach":
        df = _rows(db, """
            SELECT institution, state, course, academic_year,
                   approved_intake, approved_supernumerary, enrolled, excess
            FROM v_course_intake_status WHERE excess > 0 ORDER BY excess DESC
        """)
    elif report_type == "duplicates":
        df = _rows(db, """
            SELECT apaar_id_masked, institutions FROM v_duplicate_enrolments
            ORDER BY institutions DESC
        """)
    elif report_type == "category-summary":
        df = _rows(db, """
            SELECT quota_type, category, COUNT(*) AS students FROM students
            WHERE status IN ('valid','flagged')
            GROUP BY quota_type, category ORDER BY students DESC
        """)
    elif report_type == "state-wise":
        df = _rows(db, """
            SELECT state, SUM(total_students) AS students,
                   SUM(flagged_students) AS flagged,
                   ROUND(AVG(anomaly_score), 3) AS avg_anomaly_score
            FROM v_institution_summary GROUP BY state ORDER BY students DESC
        """)
    elif report_type == "anomalies":
        scores = db.query(AnomalyScore).order_by(AnomalyScore.score.desc()).all()
        df = pd.DataFrame([{
            "institution_id": a.institution_id,
            "course_id": a.course_id,
            "academic_year": a.academic_year,
            "score": a.score,
            "reasons": a.reasons_json,
        } for a in scores])
    else:
        raise HTTPException(
            404,
            "Unknown report type. Use: intake-breach, duplicates, "
            "category-summary, state-wise, anomalies",
        )

    audit(db, user, "REPORT_EXPORT", "reports", report_type, request)
    db.commit()
    return _excel_response({"report": df}, f"apaar_{report_type}_{stamp}.xlsx")
