"""Text-to-SQL evaluation (aiml_guide.md §6): sample questions with expected
SQL fragments.

The offline half asserts every reference answer passes the SQL guard; the live
half scores the model's output and skips when the LLM provider is unreachable,
so `pytest` still passes offline. Destructive/off-schema rejection itself is
covered in tests/test_sql_guard.py.
"""
import pytest
from openai import OpenAIError

from app.services.llm.sql_guard import validate_sql

# (question, reference SQL, fragments a correct answer must contain)
EVAL_SET = [
    ("Which colleges exceeded approved intake?",
     "SELECT institution, course, approved_intake, enrolled, excess "
     "FROM v_course_intake_status WHERE excess > 0 ORDER BY excess DESC",
     ["v_course_intake_status", "excess > 0"]),
    ("How many students are flagged in Maharashtra?",
     "SELECT SUM(flagged_students) AS flagged FROM v_institution_summary "
     "WHERE state = 'Maharashtra'",
     ["v_institution_summary", "Maharashtra"]),
    ("Which APAAR ids appear in more than one college?",
     "SELECT apaar_id_masked, institutions FROM v_duplicate_enrolments "
     "ORDER BY institutions DESC",
     ["v_duplicate_enrolments"]),
    ("Which validation rules fire most often?",
     "SELECT rule_code, severity, SUM(flag_count) AS count FROM v_flag_summary "
     "GROUP BY rule_code, severity ORDER BY count DESC",
     ["v_flag_summary", "SUM(flag_count)"]),
    ("List colleges in Maharashtra with their student counts",
     "SELECT institution, total_students FROM v_institution_summary "
     "WHERE state = 'Maharashtra'",
     ["v_institution_summary", "total_students"]),
    ("Which courses have the largest intake surplus?",
     "SELECT institution, course, excess FROM v_course_intake_status "
     "ORDER BY excess DESC",
     ["v_course_intake_status", "ORDER BY excess"]),
    ("How many validation flags exist in total?",
     "SELECT SUM(flag_count) AS total FROM v_flag_summary",
     ["v_flag_summary", "SUM(flag_count)"]),
    ("Which institutions have the most flagged students?",
     "SELECT institution, flagged_students FROM v_institution_summary "
     "ORDER BY flagged_students DESC",
     ["v_institution_summary", "flagged_students"]),
    ("Show courses where supernumerary enrolment exceeds the approval",
     "SELECT institution, course, approved_supernumerary, supernumerary_enrolled "
     "FROM v_course_intake_status WHERE supernumerary_enrolled > approved_supernumerary",
     ["v_course_intake_status", "supernumerary_enrolled > approved_supernumerary"]),
    ("Which colleges have the highest anomaly scores?",
     "SELECT institution, anomaly_score FROM v_institution_summary "
     "ORDER BY anomaly_score DESC",
     ["v_institution_summary", "anomaly_score"]),
    ("How many courses are over approved intake?",
     "SELECT COUNT(*) AS over_intake FROM v_course_intake_status WHERE excess > 0",
     ["v_course_intake_status", "COUNT(*)"]),
    ("Which courses are less than half filled?",
     "SELECT institution, course, approved_intake, enrolled "
     "FROM v_course_intake_status WHERE enrolled < approved_intake / 2",
     ["v_course_intake_status", "enrolled < approved_intake"]),
]

_IDS = [q for q, _, _ in EVAL_SET]


@pytest.mark.parametrize("question,sql,fragments", EVAL_SET, ids=_IDS)
def test_reference_sql_passes_the_guard(question, sql, fragments):
    guarded = validate_sql(sql)
    assert guarded  # guard may append LIMIT 100 but must keep the query valid
    for frag in fragments:
        assert frag in sql


@pytest.mark.parametrize("question,sql,fragments", EVAL_SET, ids=_IDS)
def test_model_answers_with_expected_fragments(question, sql, fragments):
    """Live: llama must emit guard-valid SQL containing the key fragments."""
    from app.services.llm import client as llm

    try:
        out = validate_sql(llm.text_to_sql(question))
    except OpenAIError as exc:
        pytest.skip(f"LLM unreachable: {exc}")
    for frag in fragments:
        assert frag in out, f"missing {frag!r} in model output: {out}"


def test_unanswerable_question_is_rejected_not_answered():
    """§6 target: 0 unsafe queries executed — an out-of-scope question must
    come back as UNSUPPORTED (or otherwise fail the guard), never a query."""
    from app.services.llm import client as llm

    try:
        out = llm.text_to_sql("Who is the Prime Minister of India?")
    except OpenAIError as exc:
        pytest.skip(f"LLM unreachable: {exc}")
    with pytest.raises(ValueError):
        validate_sql(out)
