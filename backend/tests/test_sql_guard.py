"""SQL guard tests (aiml_guide.md §6) — unsafe or off-schema SQL must be rejected."""
import pytest

from app.services.llm.sql_guard import validate_sql


def test_valid_query_passes_and_gains_limit():
    sql = validate_sql("SELECT institution, excess FROM v_course_intake_status WHERE excess > 0")
    assert sql.upper().endswith("LIMIT 100")


def test_existing_limit_preserved():
    sql = validate_sql("SELECT COUNT(*) FROM v_flag_summary LIMIT 5")
    assert sql.count("LIMIT") == 1


def test_insert_rejected():
    with pytest.raises(ValueError):
        validate_sql("INSERT INTO v_flag_summary VALUES (1)")


def test_drop_rejected():
    with pytest.raises(ValueError):
        validate_sql("DROP TABLE students")


def test_union_subquery_rejected():
    with pytest.raises(ValueError):
        validate_sql("SELECT * FROM v_flag_summary UNION SELECT * FROM users")


def test_raw_table_rejected():
    with pytest.raises(ValueError):
        validate_sql("SELECT * FROM students")


def test_multiple_statements_rejected():
    with pytest.raises(ValueError):
        validate_sql("SELECT * FROM v_flag_summary; SELECT 1")


def test_non_select_rejected():
    with pytest.raises(ValueError):
        validate_sql("DELETE FROM v_flag_summary")


def test_unsupported_marker_rejected():
    with pytest.raises(ValueError):
        validate_sql("UNSUPPORTED")


def test_pg_catalog_rejected():
    with pytest.raises(ValueError):
        validate_sql("SELECT * FROM pg_tables")
