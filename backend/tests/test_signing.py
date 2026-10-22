"""Phase 6 tests — Ed25519 signing, tamper detection and QR (no DB needed)."""
from app.services.verification import signing
from app.services.verification.qr import record_qr

PAYLOAD = {
    "apaar_id": "XXXXXXXX1234",
    "institution": "ABC College of Engineering",
    "course": "B.Tech Computer Engineering",
    "academic_year": "2026-27",
    "status": "ENROLLED",
    "issued_at": "2026-10-22T14:30:00+00:00",
}


def test_sign_then_verify_roundtrip():
    sig = signing.sign(PAYLOAD)
    assert signing.verify(PAYLOAD, sig) is True


def test_tampered_payload_fails():
    sig = signing.sign(PAYLOAD)
    tampered = {**PAYLOAD, "course": "B.Tech Mechatronics"}
    assert signing.verify(tampered, sig) is False


def test_tampered_signature_fails():
    sig = signing.sign(PAYLOAD)
    assert signing.verify(PAYLOAD, sig[:-4] + "AAAA") is False


def test_key_reimport_matches():
    pem = signing.public_key_pem()
    assert "BEGIN PUBLIC KEY" in pem
    assert signing.verify(PAYLOAD, signing.sign(PAYLOAD)) is True


def test_qr_is_png_data_url():
    url = record_qr(PAYLOAD, signing.sign(PAYLOAD))
    assert url.startswith("data:image/png;base64,")
    assert len(url) > 500
