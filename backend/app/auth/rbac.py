"""JWT decoding and role guards (backend_guide.md §4)."""
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def current_user(token: str = Depends(oauth2)) -> dict:
    """Decode the JWT into its payload: {sub, role, institution_id, exp}."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(401, "Invalid token")


def require_roles(*roles):
    """Dependency factory: allow only the listed roles (system.md §1)."""

    def checker(user: dict = Depends(current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(403, "Forbidden")
        return user

    return checker
