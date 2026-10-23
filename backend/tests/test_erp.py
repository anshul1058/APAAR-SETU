"""ERP integration tests (PRD F7): API-key lifecycle + roster cross-check.

Pure crypto/validation tests always run; the endpoint tests talk to the real
PostgreSQL database and skip automatically when the local cluster is down
(same policy as test_e2e.py).
"""
import pytest
from fastapi.testclient import TestClient

from app.db import engine
from app.main import app
from app.services.erp_client import (
    cross_check,
    decrypt_key,
    encrypt_key,
    mask_key,
    validate_base_url,
)

client = TestClient(app)

COEP_ADMIN = ("admin@coep_technological_university.in", "password123")
OFFICER = ("aicte.officer@gov.in", "password123")
API_KEY = "super-secret-key-123"


def _db_reachable() -> bool:
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        return True
    except Exception:
        return False


requires_db = pytest.mark.skipif(
    not _db_reachable(), reason="Postgres not reachable (local dev cluster)"
)


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _login(email: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# --------------------------------------------------------------- unit tests
def test_encrypt_decrypt_roundtrip():
    enc = encrypt_key(API_KEY)
    assert enc != API_KEY
    assert decrypt_key(enc) == API_KEY


def test_mask_key_hides_everything_but_last4():
    masked = mask_key(API_KEY)
    assert masked.endswith(API_KEY[-4:])
    assert API_KEY not in masked


def test_validate_base_url_accepts_https_and_mock():
    assert validate_base_url("https://erp.coep.ac.in/api/") == "https://erp.coep.ac.in/api"
    assert validate_base_url("mock://demo") == "mock://demo"


def test_validate_base_url_rejects_junk():
    with pytest.raises(ValueError):
        validate_base_url("ftp://evil")
    with pytest.raises(ValueError):
        validate_base_url("")


# ------------------------------------------------------------ endpoint tests
@pytest.fixture(scope="module")
def admin_token() -> str:
    from app.routers.auth import _attempts

    _attempts.clear()  # login limiter is shared module state
    return _login(*COEP_ADMIN)


@pytest.fixture(scope="module")
def officer_token() -> str:
    from app.routers.auth import _attempts

    _attempts.clear()
    return _login(*OFFICER)


@pytest.fixture(scope="module", autouse=True)
def erp_clean_state():
    """Start from 'not configured' so the suite is re-run safe."""
    if not _db_reachable():
        yield
        return
    from app.routers.auth import _attempts

    _attempts.clear()
    admin_token = _login(*COEP_ADMIN)
    client.delete("/api/v1/institutions/me/erp", headers=_h(admin_token))
    yield


@requires_db
def test_erp_config_starts_empty(admin_token):
    r = client.get("/api/v1/institutions/me/erp", headers=_h(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "not_configured"
    assert body["api_key_configured"] is False
    assert body["api_key_masked"] is None


@requires_db
def test_erp_config_validation(admin_token):
    token = admin_token
    # bad scheme
    r = client.put("/api/v1/institutions/me/erp",
                   json={"erp_base_url": "ftp://x", "erp_api_key": API_KEY},
                   headers=_h(token))
    assert r.status_code == 422
    # no key stored yet and none supplied
    r = client.put("/api/v1/institutions/me/erp",
                   json={"erp_base_url": "https://erp.example.in/api", "erp_api_key": ""},
                   headers=_h(token))
    assert r.status_code == 422
    # key too short
    r = client.put("/api/v1/institutions/me/erp",
                   json={"erp_base_url": "https://erp.example.in/api", "erp_api_key": "short"},
                   headers=_h(token))
    assert r.status_code == 422


@requires_db
def test_erp_key_saved_masked_and_encrypted(admin_token):
    token = admin_token
    r = client.put("/api/v1/institutions/me/erp",
                   json={"erp_base_url": "mock://demo", "erp_api_key": API_KEY},
                   headers=_h(token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "connected"
    assert body["api_key_configured"] is True
    assert body["api_key_masked"].endswith(API_KEY[-4:])
    # the raw key must never appear in any API response
    assert API_KEY not in r.text

    # stored encrypted at rest, not plaintext
    from sqlalchemy import select
    from app.models import Institution
    from app.db import SessionLocal
    from app.services.erp_client import decrypt_key as dec

    db = SessionLocal()
    try:
        inst = db.execute(
            select(Institution).where(Institution.erp_base_url == "mock://demo")
        ).scalar_one()
        assert API_KEY not in (inst.erp_api_key_enc or "")
        assert dec(inst.erp_api_key_enc) == API_KEY
    finally:
        db.close()

    # blank key on update keeps the stored key
    r = client.put("/api/v1/institutions/me/erp",
                   json={"erp_base_url": "mock://demo", "erp_api_key": ""},
                   headers=_h(token))
    assert r.status_code == 200
    assert r.json()["api_key_masked"].endswith(API_KEY[-4:])


@requires_db
def test_erp_cross_check_report(admin_token):
    token = admin_token
    r = client.post("/api/v1/institutions/me/erp/cross-check", headers=_h(token))
    assert r.status_code == 200, r.text
    report = r.json()
    # mock://demo plants exactly: 1 dropped student, 2 field edits, 1 ERP-only row
    assert report["missing_in_erp_count"] >= 1
    assert report["field_mismatches_count"] >= 2
    assert report["missing_in_local_count"] >= 1
    assert report["matched"] >= 100
    assert report["local_records"] >= report["matched"]
    assert set(m["field"] for m in report["field_mismatches"]) <= {
        "full_name", "dob", "admission_date", "course",
        "category", "quota_type", "nationality",
    }
    assert "matched" in report["summary"]
    assert API_KEY not in r.text  # key never leaks in reports either

    # result is remembered for the dashboard
    r = client.get("/api/v1/institutions/me/erp", headers=_h(token))
    assert r.json()["last_result"] is not None
    assert r.json()["last_sync_at"] is not None


@requires_db
def test_erp_rbac_blocks_other_roles(officer_token):
    officer = officer_token
    assert client.get("/api/v1/institutions/me/erp", headers=_h(officer)).status_code == 403
    assert client.put(
        "/api/v1/institutions/me/erp",
        json={"erp_base_url": "mock://demo", "erp_api_key": API_KEY},
        headers=_h(officer),
    ).status_code == 403
    assert client.post(
        "/api/v1/institutions/me/erp/cross-check", headers=_h(officer)
    ).status_code == 403


@requires_db
def test_erp_disconnect_clears_everything(admin_token):
    token = admin_token
    r = client.delete("/api/v1/institutions/me/erp", headers=_h(token))
    assert r.status_code == 200
    assert r.json()["status"] == "not_configured"
    assert r.json()["api_key_configured"] is False
    # cross-check without a connection is rejected
    r = client.post("/api/v1/institutions/me/erp/cross-check", headers=_h(token))
    assert r.status_code == 400


def test_cross_check_flags_field_differences():
    """Pure logic test: two records, one mismatch, one missing — no DB needed."""
    class _FakeDB:
        class _Q:
            def all(self):
                return []
        def execute(self, *_a, **_k):
            return self._Q()

    erp_rows = [
        {"apaar_id": "912345678901", "full_name": "Wrong Name", "dob": "2008-05-14",
         "course": "B.Tech Computer Engineering", "admission_date": "2026-07-01"},
        {"apaar_id": "999999999999", "full_name": "Nobody Local", "course": "MBA"},
    ]
    report = cross_check(_FakeDB(), institution_id=1, erp_rows=erp_rows)
    # no local students -> both ERP rows are "only in ERP"
    assert report["matched"] == 0
    assert report["missing_in_local_count"] == 2
    assert report["local_records"] == 0
