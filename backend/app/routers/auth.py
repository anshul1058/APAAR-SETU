"""Auth endpoints: POST /api/v1/auth/login (backend_guide.md §5)."""
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import audit
from app.config import settings
from app.db import get_db
from app.models import User
from app.schemas import TokenResponse
from app.security import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# --- simple in-memory login rate limit (system.md §6) -------------------
_WINDOW_SECONDS = 60
_MAX_ATTEMPTS = 5
_attempts: dict[str, deque[float]] = defaultdict(deque)


def _rate_limit(key: str) -> None:
    now = time.monotonic()
    q = _attempts[key]
    while q and now - q[0] > _WINDOW_SECONDS:
        q.popleft()
    if len(q) >= _MAX_ATTEMPTS:
        raise HTTPException(429, "Too many login attempts, try again later")
    q.append(now)


@router.post("/login", response_model=TokenResponse)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """OAuth2 password flow. Returns a JWT with {sub, role, institution_id, exp}."""
    email = form.username.lower().strip()
    _rate_limit(email)
    _rate_limit(f"ip:{request.client.host if request.client else '-'}")

    user: User | None = db.execute(
        select(User).where(User.email == email)
    ).scalar_one_or_none()

    if user is None or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "institution_id": user.institution_id,
        "exp": expire,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

    audit(db, payload, "LOGIN", "users", user.id, request)
    db.commit()

    return TokenResponse(
        access_token=token,
        role=user.role,
        institution_id=user.institution_id,
    )
