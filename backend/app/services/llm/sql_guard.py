"""SQL guard for the text-to-SQL path (aiml_guide.md §4.5 — MANDATORY).

Only single SELECT statements over the four approved, masked views are allowed.
"""
import re

ALLOWED_VIEWS = {"v_course_intake_status", "v_duplicate_enrolments",
                 "v_flag_summary", "v_institution_summary"}
FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|copy|pg_|information_schema)\b",
    re.I)


def validate_sql(sql: str) -> str:
    """Return a safe, LIMIT-ed single SELECT or raise ValueError."""
    s = sql.strip().rstrip(";")
    if s.upper() == "UNSUPPORTED":
        raise ValueError("Question not supported")
    if ";" in s or not s.lower().startswith("select"):
        raise ValueError("Only a single SELECT is allowed")
    if FORBIDDEN.search(s):
        raise ValueError("Forbidden keyword")
    used = set(re.findall(r"\b(?:from|join)\s+([a-z_][a-z0-9_]*)", s, re.I))
    if not used or not used.issubset(ALLOWED_VIEWS):
        raise ValueError("Only approved views are allowed")
    if " limit " not in s.lower():
        s += " LIMIT 100"
    return s
