"""Assistant endpoints (backend_guide.md §5, aiml_guide.md §4).

The LLM explains flags, converts questions to SQL over the four masked views,
and narrates computed statistics. It never decides on records and never sees
raw PII.
"""
import json
from collections import defaultdict
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.audit import audit
from app.auth.rbac import require_roles
from app.config import settings
from app.db import get_db
from app.models import Upload, ValidationFlag
from app.services.llm import client as llm
from app.services.llm.sql_guard import validate_sql

router = APIRouter(prefix="/assistant", tags=["assistant"])

AICTE = ("aicte_officer", "aicte_admin")
ANY_AUTHED = ("institution_admin", "aicte_officer", "aicte_admin")


class ExplainIn(BaseModel):
    upload_id: int


class QueryIn(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class SummaryIn(BaseModel):
    stats: dict


def _llm_reader_engine():
    """Engine on the read-only llm_reader role (backend_guide.md §3)."""
    url = settings.database_url
    parsed = urlparse(url)
    ro_url = parsed._replace(netloc="llm_reader:llm_reader@" + parsed.hostname
                             + (f":{parsed.port}" if parsed.port else "")).geturl()
    return create_engine(ro_url, pool_pre_ping=True)


@router.post("/explain")
def explain(
    body: ExplainIn,
    request: Request = None,
    user: dict = Depends(require_roles(*ANY_AUTHED)),
    db: Session = Depends(get_db),
    ):
    """LLM explanation of a upload's validation errors (grouped by rule code)."""
    upload = db.get(Upload, body.upload_id)
    if upload is None:
        raise HTTPException(404, "Upload not found")
    if user["role"] == "institution_admin" and upload.institution_id != user["institution_id"]:
        raise HTTPException(403, "Forbidden")

    flags = db.execute(
        select(ValidationFlag).where(ValidationFlag.upload_id == body.upload_id)
    ).scalars().all()

    grouped: dict[str, dict] = defaultdict(lambda: {"count": 0, "example": ""})
    for f in flags:
        g = grouped[f.rule_code]
        g["count"] += 1
        if not g["example"]:
            g["example"] = f.message

    audit(db, user, "ASSISTANT_EXPLAIN", "uploads", body.upload_id, request)
    db.commit()
    if not grouped:
        return {"explanation": "This upload has no validation flags.", "by_rule": {}}
    explanation = llm.explain_errors(json.dumps(grouped))
    return {"explanation": explanation, "by_rule": dict(grouped)}


@router.post("/query")
def query(
    body: QueryIn,
    request: Request = None,
    user: dict = Depends(require_roles(*AICTE)),
    db: Session = Depends(get_db),
):
    """Natural-language question -> SQL (guarded) -> rows via llm_reader -> summary."""
    try:
        sql = validate_sql(llm.text_to_sql(body.question))
    except ValueError as exc:
        raise HTTPException(400, f"Question not supported: {exc}")
    except Exception:
        raise HTTPException(503, llm.BUSY_MESSAGE)

    try:
        with _llm_reader_engine().connect() as conn:
            conn.execute(text("SET statement_timeout = '5s'"))
            rows = [dict(r) for r in conn.execute(text(sql)).mappings().all()]
    except Exception as exc:
        raise HTTPException(400, f"Generated query failed: {exc}")

    audit(db, user, "ASSISTANT_QUERY", "llm", sql[:64], request)
    db.commit()
    summary = llm.summarise(json.dumps({"question": body.question, "rows": rows[:20]}))
    return {"sql": sql, "rows": rows, "summary": summary}


@router.post("/summary")
def summary(
    body: SummaryIn,
    request: Request = None,
    user: dict = Depends(require_roles(*AICTE)),
    db: Session = Depends(get_db),
):
    """Narrative paragraph from numbers the backend already computed."""
    audit(db, user, "ASSISTANT_SUMMARY", "llm", "report", request)
    db.commit()
    return {"summary": llm.summarise(json.dumps(body.stats))}
