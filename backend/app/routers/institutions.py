"""Institution ERP endpoints (PRD F7): API-key management + data cross-check.

Only the institution's own admin may manage its connection (RBAC + /me scope,
so one college can never see or touch another college's key). The key itself
is stored encrypted and never leaves the server — responses expose only a
masked last-4 hint.
"""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.audit import audit
from app.auth.rbac import require_roles
from app.db import get_db
from app.models import Institution
from app.services import erp_client

router = APIRouter(prefix="/institutions", tags=["institutions"])


class ErpConfigIn(BaseModel):
    erp_base_url: str = Field(min_length=1, max_length=500)
    # blank = keep the key already stored (lets the URL be edited without re-typing)
    erp_api_key: str = Field(default="", max_length=500)


def _own_institution(db: Session, user: dict) -> Institution:
    inst_id = user.get("institution_id")
    if not inst_id:
        raise HTTPException(403, "Only institution accounts have an ERP connection")
    inst = db.get(Institution, inst_id)
    if inst is None:
        raise HTTPException(404, "Institution not found")
    return inst


def _config_out(inst: Institution) -> dict:
    return {
        "institution_id": inst.id,
        "institution_name": inst.name,
        "erp_base_url": inst.erp_base_url,
        "api_key_configured": bool(inst.erp_api_key_enc),
        "api_key_masked": ("********" + inst.erp_last4) if inst.erp_api_key_enc else None,
        "status": inst.erp_status or "not_configured",
        "connected_at": inst.erp_connected_at.isoformat() if inst.erp_connected_at else None,
        "last_sync_at": inst.erp_last_sync_at.isoformat() if inst.erp_last_sync_at else None,
        "last_result": json.loads(inst.erp_last_result) if inst.erp_last_result else None,
    }


@router.get("/me/erp")
def get_erp_config(
    user: dict = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    """Current ERP connection for YOUR institution (key shown masked only)."""
    return _config_out(_own_institution(db, user))


@router.put("/me/erp")
def set_erp_config(
    payload: ErpConfigIn,
    request: Request,
    user: dict = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    """Save the ERP base URL + API key for YOUR institution.

    The key is encrypted at rest; an empty key keeps the stored one.
    """
    inst = _own_institution(db, user)
    try:
        base = erp_client.validate_base_url(payload.erp_base_url)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    key = payload.erp_api_key.strip()
    if key:
        if len(key) < 8:
            raise HTTPException(422, "API key looks too short (minimum 8 characters)")
        inst.erp_api_key_enc = erp_client.encrypt_key(key)
        inst.erp_last4 = key[-4:]
    elif not inst.erp_api_key_enc:
        raise HTTPException(422, "API key is required")

    inst.erp_base_url = base
    inst.erp_status = "connected"
    if inst.erp_connected_at is None:
        inst.erp_connected_at = datetime.now()
    # never log the key itself — only that it was set
    audit(db, user, "ERP_KEY_SET", "institutions", inst.id, request)
    db.commit()
    db.refresh(inst)
    return _config_out(inst)


@router.delete("/me/erp")
def disconnect_erp(
    request: Request,
    user: dict = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    """Remove the stored connection (key + URL + last result) for YOUR institution."""
    inst = _own_institution(db, user)
    inst.erp_base_url = None
    inst.erp_api_key_enc = None
    inst.erp_last4 = ""
    inst.erp_status = "not_configured"
    inst.erp_connected_at = None
    inst.erp_last_sync_at = None
    inst.erp_last_result = None
    audit(db, user, "ERP_KEY_REMOVED", "institutions", inst.id, request)
    db.commit()
    db.refresh(inst)
    return _config_out(inst)


@router.post("/me/erp/cross-check")
def cross_check_erp(
    request: Request,
    user: dict = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    """Pull the ERP roster and cross-check it against local records.

    Compares identity (APAAR / passport / roll number) plus name, DOB,
    admission date, course, category, quota and nationality. Returns a
    report: matched, missing-in-ERP, only-in-ERP and field mismatches.
    """
    inst = _own_institution(db, user)
    if not inst.erp_api_key_enc or not inst.erp_base_url:
        raise HTTPException(400, "Configure the ERP connection first")

    try:
        api_key = erp_client.decrypt_key(inst.erp_api_key_enc)
    except Exception:
        raise HTTPException(500, "Stored API key could not be read — please re-enter it")

    try:
        rows = erp_client.fetch_erp_students(
            inst.erp_base_url, api_key, db=db, institution_id=inst.id
        )
        report = erp_client.cross_check(db, inst.id, rows)
    except erp_client.ERPError as exc:
        inst.erp_status = "error"
        inst.erp_last_sync_at = datetime.now()
        audit(db, user, "ERP_CROSS_CHECK_FAILED", "institutions", inst.id, request)
        db.commit()
        raise HTTPException(502, str(exc))

    inst.erp_status = "connected"
    inst.erp_last_sync_at = datetime.now()
    inst.erp_last_result = erp_client.dumps_result(report)
    audit(db, user, "ERP_CROSS_CHECK", "institutions", inst.id, request)
    db.commit()
    return report
