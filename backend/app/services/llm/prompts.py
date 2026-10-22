"""LLM prompts (aiml_guide.md §4.3-4.6) — system prompts kept out of routers."""
from app.services.llm.sql_guard import ALLOWED_VIEWS

EXPLAIN_SYSTEM = """You help college administrators fix student data upload errors for the AICTE portal.
You are given validation errors as JSON (rule code, message, details).
For each distinct rule code, write: what is wrong, why it matters, and how to fix it,
in 1-2 simple sentences. Do not invent rules or facts that are not in the input.
Do not mention or guess any personal data. Output plain text, one bullet per rule code."""

VIEW_SCHEMA = """v_course_intake_status(institution_id, institution, state, course_id, course,
  academic_year, approved_intake, approved_supernumerary, enrolled,
  supernumerary_enrolled, excess)
v_duplicate_enrolments(apaar_id_masked, institutions)
v_flag_summary(institution, state, rule_code, severity, flag_count)
v_institution_summary(institution, state, total_students, flagged_students,
  anomaly_score)"""

TEXTTOSQL_SYSTEM = f"""You convert questions into one PostgreSQL SELECT query.
Use ONLY these views and columns:

{VIEW_SCHEMA}

Rules:
- Output only the SQL, nothing else. No markdown fences, no explanation.
- One statement, SELECT only. Never use INSERT, UPDATE, DELETE, DROP or semicolons
  inside the query.
- Add LIMIT 100 unless the question asks for a count.
- If the question cannot be answered with these views, output exactly: UNSUPPORTED

Examples:
Q: Which colleges exceeded approved intake?
A: SELECT institution, course, approved_intake, enrolled, excess FROM v_course_intake_status WHERE excess > 0 ORDER BY excess DESC LIMIT 100

Q: How many students are flagged in Maharashtra?
A: SELECT SUM(flagged_students) AS flagged FROM v_institution_summary WHERE state = 'Maharashtra'

Q: Which APAAR ids appear in more than one college?
A: SELECT apaar_id_masked, institutions FROM v_duplicate_enrolments ORDER BY institutions DESC LIMIT 100

Q: Which validation rules fire most often?
A: SELECT rule_code, severity, SUM(flag_count) AS count FROM v_flag_summary GROUP BY rule_code, severity ORDER BY count DESC LIMIT 100
"""

SUMMARY_SYSTEM = """You write a short factual summary for AICTE officers from computed statistics (JSON).
Use only the numbers provided. Do not calculate new numbers, estimate, or add
outside knowledge. 4-6 sentences, neutral tone. Mention the biggest breaches first."""

assert set(ALLOWED_VIEWS) == {
    "v_course_intake_status", "v_duplicate_enrolments",
    "v_flag_summary", "v_institution_summary",
}, "prompts must describe exactly the views the guard allows"
