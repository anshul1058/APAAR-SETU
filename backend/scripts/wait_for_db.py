"""Wait for PostgreSQL database to become available before starting services.

Useful in containerized environments (Docker, Compose, Cloud deploys) where
the database container/service may take a few seconds to accept connections.
"""
import sys
import time
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from app.config import settings
from app.db import engine


def wait_for_db(max_retries: int = 30, delay_seconds: float = 2.0) -> bool:
    url_masked = settings.database_url.split("@")[-1] if "@" in settings.database_url else "database"
    print(f"[wait_for_db] Checking database readiness ({url_masked})...")

    # If using in-memory or SQLite file, no wait needed
    if "sqlite" in settings.database_url.lower():
        print("[wait_for_db] SQLite detected, continuing.")
        return True

    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"[wait_for_db] Database is ready (connected on attempt {attempt}).")
            return True
        except Exception as exc:
            err_msg = str(exc).split("\n")[0]
            print(f"[wait_for_db] Attempt {attempt}/{max_retries} failed ({err_msg}). Retrying in {delay_seconds}s...")
            time.sleep(delay_seconds)

    print(f"[wait_for_db] ERROR: Timed out waiting for database after {max_retries * delay_seconds}s.", file=sys.stderr)
    return False


if __name__ == "__main__":
    if not wait_for_db():
        sys.exit(1)
