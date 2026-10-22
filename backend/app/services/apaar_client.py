"""APAAR service adapter (backend_guide.md §6.3).

Mock now, real API later — swap via APAAR_MODE env var without touching
the validation engine.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import APAARRecord


class APAARClient:
    """Interface for the national APAAR registry."""

    def exists(self, apaar_id: str) -> bool:
        raise NotImplementedError


class MockAPAARClient(APAARClient):
    """Treats IDs present in the synthetic apaar_registry table as valid."""

    def __init__(self, known_ids: set[str]):
        self.known = known_ids

    def exists(self, apaar_id: str) -> bool:
        return apaar_id in self.known


class RealAPAARClient(APAARClient):
    """Placeholder for the real APAAR API (not implemented)."""

    def exists(self, apaar_id: str) -> bool:
        raise NotImplementedError("Real APAAR API not configured")


def get_client(db: Session | None = None) -> APAARClient:
    if settings.apaar_mode == "real":
        return RealAPAARClient()
    known: set[str] = set()
    if db is not None:
        known = set(db.execute(select(APAARRecord.apaar_id)).scalars())
    return MockAPAARClient(known)
