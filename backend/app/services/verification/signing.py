"""Ed25519 record signing (backend_guide.md §8).

SIGNING_PRIVATE_KEY holds a base64-encoded PEM Ed25519 private key.
If unset (demo mode), an ephemeral keypair is generated at startup —
signatures then validate only until the process restarts.
"""
import base64
import json

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from app.config import settings


def _load_private_key() -> Ed25519PrivateKey:
    if settings.signing_private_key:
        pem = base64.b64decode(settings.signing_private_key)
        key = serialization.load_pem_private_key(pem, password=None)
        if not isinstance(key, Ed25519PrivateKey):
            raise ValueError("SIGNING_PRIVATE_KEY is not an Ed25519 key")
        return key
    return Ed25519PrivateKey.generate()


_private_key = _load_private_key()
_public_key: Ed25519PublicKey = _private_key.public_key()


def canonical(payload: dict) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()


def sign(payload: dict) -> str:
    return base64.urlsafe_b64encode(_private_key.sign(canonical(payload))).decode()


def verify(payload: dict, signature: str) -> bool:
    try:
        _public_key.verify(base64.urlsafe_b64decode(signature), canonical(payload))
        return True
    except Exception:
        return False


def public_key_pem() -> str:
    return _public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()


def public_key_b64() -> str:
    return base64.urlsafe_b64encode(
        _public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
    ).decode()
