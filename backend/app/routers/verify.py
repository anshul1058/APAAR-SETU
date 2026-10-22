"""Verification endpoints (backend_guide.md §5, §8; system.md §5)."""
import time
from collections import deque
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import audit
from app.auth.rbac import require_roles
from app.db import get_db
from app.models import Consent, STATUS_FLAGGED, STATUS_VALID, Student, Verification
from app.services.verification import signing
from app.services.verification.consent import MAX_ATTEMPTS, check_otp, create_consent
from app.services.verification.qr import record_qr

router = APIRouter(prefix="/verify", tags=["verify"])

# simple per-IP throttle on /request (system.md §6)
_req_window: dict[str, deque[float]] = {}


def _throttle(key: str, limit: int = 20, window: int = 300) -> None:
    now = time.monotonic()
    q = _req_window.setdefault(key, deque())
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(429, "Too many verification requests, try later")
    q.append(now)


class VerifyRequestIn(BaseModel):
    apaar_id: str = Field(min_length=4, max_length=12)
    purpose: str = "verification"


class VerifyConfirmIn(BaseModel):
    consent_id: int
    otp: str = Field(min_length=6, max_length=6)


class VerifyCheckIn(BaseModel):
    payload: dict
    signature: str


@router.post("/request")
def verify_request(
    body: VerifyRequestIn,
    request: Request = None,
    user: dict = Depends(require_roles("verifier")),
    db: Session = Depends(get_db),
):
    """Start verification: creates a consent + OTP (OTP returned in demo mode)."""
    _throttle(f"ip:{request.client.host if request.client else '-'}")
    student = db.execute(
        select(Student).where(Student.apaar_id == body.apaar_id)
        .where(Student.status.in_([STATUS_VALID, STATUS_FLAGGED]))
    ).scalars().first()
    if student is None:
        raise HTTPException(404, "No active student found for this APAAR ID")

    consent, otp = create_consent(db, student.id, int(user["sub"]), body.purpose)
    audit(db, user, "VERIFY_REQUEST", "consents", consent.id, request)
    db.commit()
    return {
        "consent_id": consent.id,
        "expires_at": consent.expires_at.isoformat(),
        "otp_demo": otp,  # real deployment: deliver via SMS/email
    }


@router.post("/confirm")
def verify_confirm(
    body: VerifyConfirmIn,
    request: Request = None,
    user: dict = Depends(require_roles("verifier")),
    db: Session = Depends(get_db),
):
    """Submit OTP -> signed record + QR."""
    consent = db.get(Consent, body.consent_id)
    if consent is None or consent.verifier_id != int(user["sub"]):
        raise HTTPException(404, "Consent request not found")
    if not check_otp(consent, body.otp):
        db.commit()  # persist the attempt counter
        raise HTTPException(400, "Invalid or expired OTP")

    from app.models import Course, Institution

    consent.granted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    student = db.get(Student, consent.student_id)
    course = db.get(Course, student.course_id)
    inst = db.get(Institution, student.institution_id)

    payload = {
        "apaar_id": "XXXXXXXX" + student.apaar_id[-4:],
        "institution": inst.name,
        "course": course.name,
        "academic_year": course.academic_year,
        "status": "ENROLLED",
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    signature = signing.sign(payload)
    record = Verification(
        student_id=student.id, verifier_id=int(user["sub"]),
        consent_id=consent.id, result="VERIFIED", signature=signature,
    )
    db.add(record)
    audit(db, user, "VERIFY_CONFIRM", "verifications", record.id, request)
    db.commit()

    return {
        "payload": payload,
        "signature": signature,
        "qr_data_url": record_qr(payload, signature),
    }


@router.post("/check")
def verify_check(body: VerifyCheckIn):
    """Public: validate any payload + signature (offline check with the public key)."""
    return {"valid": signing.verify(body.payload, body.signature)}


@router.get("/public-key")
def public_key():
    """Public: PEM public key for offline signature verification."""
    return {"algorithm": "Ed25519", "public_key_pem": signing.public_key_pem()}
