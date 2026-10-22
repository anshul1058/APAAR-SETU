"""Phase 0 smoke tests — app boots and health endpoint responds."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_cors_allows_configured_origin():
    resp = client.get(
        "/health", headers={"Origin": "http://localhost:5173"}
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"
