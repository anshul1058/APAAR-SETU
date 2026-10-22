"""Consent + OTP handling (backend_guide.md §8, system.md §5).

OTP: 6 digits, hashed at rest, 15-minute expiry, max 5 attempts.
Demo mode returns the OTP in the response (a real deployment would
deliver it by SMS/email).
"""
import hashlib
import random
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import Consent

OTP_TTL_MINUTES = 15
MAX_ATTEMPTS = 5


def _hash(otp: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{otp}".encode()).hexdigest()


def create_consent(db: Session, student_id: int, verifier_id: int, purpose: str) -> tuple[Consent, str]:
    """Create a pending consent + OTP. Returns (consent, otp) — otp only for the demo."""
    otp = f"{random.randint(0, 999999):06d}"
    salt = secrets.token_hex(8)
    consent = Consent(
        student_id=student_id,
        verifier_id=verifier_id,
        purpose=purpose,
        otp_hash=f"{salt}:{_hash(otp, salt)}",
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None)
        + timedelta(minutes=OTP_TTL_MINUTES),
    )
    db.add(consent)
    db.flush()
    return consent, otp


def check_otp(consent: Consent, otp: str) -> bool:
    """Verify OTP against the stored hash with attempt + expiry limits."""
    from datetime import datetime as dt

    if consent.revoked or consent.granted_at is not None:
        return False
    if consent.expires_at.replace(tzinfo=None) < dt.utcnow():
        return False
    if consent.otp_attempts >= MAX_ATTEMPTS:
        return False
    salt, stored = consent.otp_hash.split(":", 1)
    consent.otp_attempts += 1
    return secrets.compare_digest(_hash(otp, salt), stored)
