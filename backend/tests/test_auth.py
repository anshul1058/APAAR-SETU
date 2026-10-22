"""Phase 2 tests — auth and RBAC (uses an in-memory SQLite session via a
FastAPI dependency override; the global app config/DB is untouched)."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base, get_db
from app.main import app
from app.models import User
from app.security import hash_password

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def db_override():
    """Apply the SQLite override for each test, REMOVE it afterwards so it
    cannot leak into other test modules (e.g. the Postgres e2e suite)."""
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
client = TestClient(app)


@pytest.fixture(autouse=True)
def seed_users():
    db = TestingSession()
    db.query(User).delete()
    db.add_all([
        User(email="admin@abc.in", role="institution_admin", institution_id=1,
             password_hash=hash_password("password123")),
        User(email="officer@gov.in", role="aicte_officer", password_hash=hash_password("password123")),
    ])
    db.commit()
    db.close()


def _login(email: str, password: str) -> dict:
    resp = client.post(
        "/api/v1/auth/login", data={"username": email, "password": password}
    )
    return resp


def test_login_success_returns_jwt():
    resp = _login("admin@abc.in", "password123")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["role"] == "institution_admin"
    assert body["institution_id"] == 1
    claims = jwt.decode(body["access_token"], settings.jwt_secret, algorithms=["HS256"])
    assert claims["role"] == "institution_admin"
    assert claims["sub"]  # user id present


def test_login_wrong_password_401():
    resp = _login("admin@abc.in", "wrong-password")
    assert resp.status_code == 401


def test_login_unknown_user_401():
    resp = _login("nobody@gov.in", "password123")
    assert resp.status_code == 401


def test_protected_route_requires_token():
    resp = client.get("/api/v1/students")  # not implemented yet -> 401/404/405 but NOT 200
    assert resp.status_code != 200


def test_garbage_token_rejected():
    resp = client.get(
        "/api/v1/students", headers={"Authorization": "Bearer not-a-real-token"}
    )
    # 404 until /students exists in Phase 3; afterwards must be 401/403
    assert resp.status_code in (401, 403, 404)
    if resp.status_code != 404:
        assert resp.status_code in (401, 403)
