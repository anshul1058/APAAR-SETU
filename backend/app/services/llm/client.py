"""OpenAI-compatible LLM client (aiml_guide.md §4.1).

Works with Groq (hosted) or Ollama (local) via env vars only.
Includes a tiny prompt-hash cache and a friendly busy fallback.
"""
import hashlib
import logging
import time

from openai import OpenAI, OpenAIError, RateLimitError

from app.config import settings
from app.services.llm.prompts import (
    EXPLAIN_SYSTEM,
    SUMMARY_SYSTEM,
    TEXTTOSQL_SYSTEM,
)

log = logging.getLogger("llm")
_cache: dict[str, str] = {}

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(base_url=settings.llm_url, api_key=settings.llm_key)
    return _client


def chat(system: str, user: str, temperature: float = 0.1, max_tokens: int = 500) -> str:
    key = hashlib.sha256(f"{system}|{user}".encode()).hexdigest()
    if key in _cache:
        return _cache[key]
    for attempt in (1, 2):
        try:
            r = _get_client().chat.completions.create(
                model=settings.llm_model,
                messages=[{"role": "system", "content": system},
                          {"role": "user", "content": user}],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=30,
            )
            text = r.choices[0].message.content.strip()
            break
        except RateLimitError:
            if attempt == 2:  # aiml_guide §4.1: one short retry on HTTP 429
                raise
            time.sleep(1.5)
        except OpenAIError as exc:
            log.warning("LLM call failed: %s", exc)
            raise
    _cache[key] = text
    return text


BUSY_MESSAGE = ("The assistant is busy right now. Please try again in a moment — "
                "in the meantime the raw error list above is complete and accurate.")


def safe_chat(system: str, user: str, **kw) -> str:
    """chat() with a friendly fallback instead of an exception."""
    try:
        return chat(system, user, **kw)
    except Exception:
        return BUSY_MESSAGE


def explain_errors(flags_json: str) -> str:
    return safe_chat(EXPLAIN_SYSTEM, flags_json)


def text_to_sql(question: str) -> str:
    return chat(TEXTTOSQL_SYSTEM, question, max_tokens=200)


def summarise(stats_json: str) -> str:
    return safe_chat(SUMMARY_SYSTEM, stats_json, max_tokens=400)
