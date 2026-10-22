"""Upload endpoints (backend_guide.md §5, §7)."""
import json

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import audit
from app.auth.rbac import require_roles
from app.db import get_db
from app.models import Upload, ValidationFlag
from app.services.validation.engine import run_validation
from app.services.validation.parser import parse_file, template_csv

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.get("/template")
def download_template():
    """CSV template institutions should follow when uploading."""
    return PlainTextResponse(
        template_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=apaar_upload_template.csv"},
    )


@router.post("")
def upload(
    file: UploadFile = File(...),
    request: Request = None,
    user: dict = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    """Upload a CSV/Excel of students; returns a validation summary."""
    rows = parse_file(file)
    result = run_validation(
        rows,
        institution_id=user["institution_id"],
        db=db,
        uploaded_by=int(user["sub"]),
        filename=file.filename or "upload",
    )
    # lifecycle step 5: anomaly scoring refresh after every upload (system.md §4)
    from app.services.analytics.anomaly import compute_anomalies
    from app.services.validation.engine import DEFAULT_ACADEMIC_YEAR
    compute_anomalies(db, DEFAULT_ACADEMIC_YEAR)
    audit(db, user, "UPLOAD", "uploads", result["upload_id"], request)
    db.commit()
    return result


@router.get("/{upload_id}")
def upload_status(
    upload_id: int,
    user: dict = Depends(require_roles("institution_admin", "aicte_officer", "aicte_admin")),
    db: Session = Depends(get_db),
):
    """Upload status and counts (scoped to your institution if institution_admin)."""
    upload = db.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(404, "Upload not found")
    if user["role"] == "institution_admin" and upload.institution_id != user["institution_id"]:
        raise HTTPException(403, "Forbidden")
    return {
        "id": upload.id,
        "institution_id": upload.institution_id,
        "filename": upload.filename,
        "total_rows": upload.total_rows,
        "valid_rows": upload.valid_rows,
        "invalid_rows": upload.invalid_rows,
        "status": upload.status,
        "created_at": upload.created_at.isoformat(),
    }


@router.get("/{upload_id}/flags")
def upload_flags(
    upload_id: int,
    user: dict = Depends(require_roles("institution_admin", "aicte_officer", "aicte_admin")),
    db: Session = Depends(get_db),
):
    """Per-row errors/warnings for one upload."""
    upload = db.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(404, "Upload not found")
    if user["role"] == "institution_admin" and upload.institution_id != user["institution_id"]:
        raise HTTPException(403, "Forbidden")
    flags = db.execute(
        select(ValidationFlag).where(ValidationFlag.upload_id == upload_id)
        .order_by(ValidationFlag.row_number)
    ).scalars().all()
    return [
        {
            "row_number": f.row_number,
            "rule_code": f.rule_code,
            "severity": f.severity,
            "message": f.message,
            "details": json.loads(f.details_json) if f.details_json else None,
            "resolved": f.resolved,
        }
        for f in flags
    ]
