"""Create tables (SQLAlchemy), apply views, create the read-only LLM role.

Usage: python scripts/init_db.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import inspect, text

from app.config import settings
from app.db import Base, SessionLocal, engine
import app.models  # noqa: F401  (registers all tables on Base.metadata)


def init_db() -> None:
    print(f"[init_db] connecting to: {settings.database_url.split('@')[-1]}")
    Base.metadata.create_all(bind=engine)
    tables = sorted(inspect(engine).get_table_names())
    print(f"[init_db] tables ({len(tables)}): {', '.join(tables)}")

    views_sql = (Path(__file__).resolve().parents[1] / "sql" / "views.sql").read_text()
    # strip --comments so the splitter doesn't send comment-only chunks
    cleaned = "\n".join(
        line for line in views_sql.splitlines() if not line.strip().startswith("--")
    )
    with engine.begin() as conn:
        for stmt in cleaned.split(";"):
            if stmt.strip():
                conn.execute(text(stmt))
    views = sorted(
        r[0]
        for r in engine.connect().execute(
            text("SELECT table_name FROM information_schema.views "
                 "WHERE table_schema = 'public'")
        )
    )
    print(f"[init_db] views ({len(views)}): {', '.join(views)}")

    # Read-only role for the LLM text-to-SQL path (backend_guide.md §3)
    with engine.begin() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_roles WHERE rolname = 'llm_reader'")
        ).scalar()
        if not exists:
            conn.execute(text("CREATE ROLE llm_reader LOGIN PASSWORD 'llm_reader'"))
            print("[init_db] created role: llm_reader (password: llm_reader)")
        conn.execute(
            text(
                "GRANT SELECT ON v_institution_summary, v_course_intake_status, "
                "v_flag_summary, v_duplicate_enrolments TO llm_reader"
            )
        )
        print("[init_db] granted SELECT on 4 views to llm_reader")


if __name__ == "__main__":
    init_db()
    SessionLocal().close()
    print("[init_db] done")
