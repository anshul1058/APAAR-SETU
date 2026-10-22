"""End-to-end tests against the REAL Postgres database (Phases 1-8).

Skipped automatically when the database is unreachable, so `pytest` still
passes on machines without the local Postgres cluster.

Covers: login (all roles) -> upload of the synthetic CSV with 16 known
injected errors -> flags -> dashboards -> RBAC scoping -> verification
consent/OTP/signing/QR -> reports export.
"""
import csv
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal, engine
from app.main import app

client = TestClient(app)

SYNTHETIC = Path(__file__).resolve().parents[1] / "data" / "synthetic" / "students.csv"


def _db_reachable() -> bool:
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _db_reachable(), reason="Postgres not reachable (local dev cluster)"
)


@pytest.fixture(scope="module", autouse=True)
def clean_upload_artifacts():
    """Remove everything produced by previous e2e runs (uploads, their students,
    flags, anomaly scores) so upload assertions are deterministic on re-runs.
    Seeded data (source_upload_id IS NULL) is untouched."""
    from sqlalchemy import delete as sql_delete

    from app.models import AnomalyScore, Student, Upload

    db = SessionLocal()
    try:
        db.execute(sql_delete(Student).where(Student.source_upload_id.is_not(None)))
        db.execute(sql_delete(Upload))
        db.execute(sql_delete(AnomalyScore))
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture(scope="module")
def tokens() -> dict:
    from app.routers.auth import _attempts

    _attempts.clear()  # login rate limiter is shared module state
    out = {}
    for key, (email, pw) in {
        "admin": ("admin@abc.in", "password123"),
        "officer": ("aicte.officer@gov.in", "password123"),
        "verifier": ("verifier@verify.in", "password123"),
    }.items():
        r = client.post("/api/v1/auth/login", data={"username": email, "password": pw})
        assert r.status_code == 200, f"{email}: {r.text}"
        out[key] = r.json()["access_token"]
    return out


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _register_synthetic_apaar_ids() -> None:
    """The mock registry must know the generated IDs (except the broken ones)."""
    from sqlalchemy import select
    from app.models import APAARRecord

    with open(SYNTHETIC, newline="", encoding="utf-8") as f:
        ids = {r["apaar_id"] for r in csv.DictReader(f)}
    db = SessionLocal()
    try:
        known = set(db.execute(select(APAARRecord.apaar_id)).scalars())
        for aid in ids - known:
            if aid.isdigit() and len(aid) == 12:
                db.add(APAARRecord(apaar_id=aid))
        db.commit()
    finally:
        db.close()


def test_upload_synthetic_csv_catches_injected_errors(tokens):
    _register_synthetic_apaar_ids()
    with open(SYNTHETIC, "rb") as f:
        r = client.post(
            "/api/v1/uploads",
            files={"file": ("students.csv", f, "text/csv")},
            headers=_h(tokens["admin"]),
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 203
    by_rule = body["by_rule"]
    # every injected error class from generate_synthetic.py must be caught
    # (the 4 bad APAAR cells are '123' x2 + 'ABCDEFGHIJKL' x2 -> FORMAT, no empties)
    assert by_rule.get("APAAR_FORMAT", 0) == 4
    assert by_rule.get("APAAR_MISSING", 0) == 0
    assert by_rule.get("DUP_IN_UPLOAD", 0) == 3
    assert by_rule.get("DOB_INVALID", 0) == 2
    assert by_rule.get("ADMISSION_DATE_INVALID", 0) == 2
    assert by_rule.get("CATEGORY_INVALID", 0) == 2
    assert by_rule.get("FIELD_MISSING", 0) >= 1
    assert by_rule.get("INTAKE_EXCEEDED", 0) >= 1  # ABC CS: 47 > 40 seeded
    assert body["errors"] > 0 and body["valid"] > 150


def test_upload_status_and_flags_scoped(tokens):
    r = client.get("/api/v1/uploads", headers=_h(tokens["admin"]))
    assert r.status_code == 405  # GET /uploads not a route — list is per-id only
    # officer can read the latest upload's flags; grab one id from the DB
    from app.models import Upload
    from sqlalchemy import select
    db = SessionLocal()
    try:
        upload_id = db.execute(select(Upload.id).order_by(Upload.id.desc())).scalars().first()
    finally:
        db.close()
    r = client.get(f"/api/v1/uploads/{upload_id}/flags", headers=_h(tokens["officer"]))
    assert r.status_code == 200
    flags = r.json()
    assert any(f["rule_code"] == "DUP_IN_UPLOAD" for f in flags)


def test_dashboards_show_seeded_reality(tokens):
    r = client.get("/api/v1/dashboard/overview", headers=_h(tokens["officer"]))
    assert r.status_code == 200
    ov = r.json()
    assert ov["institutions"] == 8
    assert ov["students"] >= 600
    assert ov["cross_institution_duplicates"] >= 1
    assert any(s["state"] == "Maharashtra" for s in ov["by_state"])

    r = client.get("/api/v1/dashboard/intake", headers=_h(tokens["officer"]))
    assert r.status_code == 200
    intake = r.json()
    assert any(row["excess"] > 0 for row in intake), "seeded intake breach missing"

    r = client.get("/api/v1/dashboard/duplicates", headers=_h(tokens["officer"]))
    assert r.status_code == 200 and len(r.json()) >= 1

    r = client.get("/api/v1/dashboard/anomalies", headers=_h(tokens["officer"]))
    assert r.status_code == 200 and len(r.json()) >= 1

    r = client.get("/api/v1/dashboard/categories", headers=_h(tokens["officer"]))
    assert r.status_code == 200
    assert any(q["quota_type"] == "nri" for q in r.json()["by_quota"])


def test_rbac_scoping(tokens):
    # institution admin cannot see national dashboards
    r = client.get("/api/v1/dashboard/overview", headers=_h(tokens["admin"]))
    assert r.status_code == 403
    # officer cannot upload
    r = client.post("/api/v1/uploads", headers=_h(tokens["officer"]))
    assert r.status_code in (401, 403)
    # officer sees MASKED students, admin sees full records
    r = client.get("/api/v1/students", headers=_h(tokens["officer"]))
    assert r.status_code == 200 and r.json()
    assert "apaar_id_masked" in r.json()[0] and "XXXXXXXX" in r.json()[0]["apaar_id_masked"]
    r = client.get("/api/v1/students", headers=_h(tokens["admin"]))
    assert r.status_code == 200 and "apaar_id" in r.json()[0]


def test_verification_flow(tokens):
    # find any active student's APAAR id
    from sqlalchemy import select
    from app.models import Student, STATUS_VALID, STATUS_FLAGGED
    db = SessionLocal()
    try:
        apaar = db.execute(
            select(Student.apaar_id).where(Student.status.in_([STATUS_VALID, STATUS_FLAGGED]))
        ).scalars().first()
    finally:
        db.close()

    r = client.post("/api/v1/verify/request",
                    json={"apaar_id": apaar}, headers=_h(tokens["verifier"]))
    assert r.status_code == 200, r.text
    consent_id, otp = r.json()["consent_id"], r.json()["otp_demo"]
    assert len(otp) == 6

    r = client.post("/api/v1/verify/confirm",
                    json={"consent_id": consent_id, "otp": "000000"},
                    headers=_h(tokens["verifier"]))
    assert r.status_code == 400  # wrong OTP rejected

    r = client.post("/api/v1/verify/confirm",
                    json={"consent_id": consent_id, "otp": otp},
                    headers=_h(tokens["verifier"]))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["signature"] and body["qr_data_url"].startswith("data:image/png")
    assert "XXXXXXXX" in body["payload"]["apaar_id"]

    # public check: valid signature passes, tampered fails
    r = client.post("/api/v1/verify/check",
                    json={"payload": body["payload"], "signature": body["signature"]})
    assert r.json() is True or r.json().get("valid") is True

    tampered = {**body["payload"], "course": "Fake Course"}
    r = client.post("/api/v1/verify/check",
                    json={"payload": tampered, "signature": body["signature"]})
    assert (r.json() if isinstance(r.json(), bool) else r.json()["valid"]) is False

    r = client.get("/api/v1/verify/public-key")
    assert r.status_code == 200 and "Ed25519" == r.json()["algorithm"]


def test_report_export(tokens):
    r = client.get("/api/v1/reports/intake-breach", headers=_h(tokens["officer"]))
    assert r.status_code == 200
    assert r.headers["content-type"].startswith(
        "application/vnd.openxmlformats")
    assert len(r.content) > 1000

    r = client.get("/api/v1/reports/nope", headers=_h(tokens["officer"]))
    assert r.status_code == 404


def test_audit_log_written(tokens):
    from sqlalchemy import select
    from app.models import AuditLog
    db = SessionLocal()
    try:
        actions = set(db.execute(select(AuditLog.action)).scalars())
    finally:
        db.close()
    assert {"LOGIN", "UPLOAD", "VERIFY_REQUEST", "VERIFY_CONFIRM", "REPORT_EXPORT"} <= actions
