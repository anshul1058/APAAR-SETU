"""Password hashing helpers (bcrypt directly — passlib 1.7.4 is incompatible
with bcrypt>=4.1, so we use the bcrypt library itself)."""
import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False
