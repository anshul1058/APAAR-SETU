"""Phase 3 unit tests — row rules (no DB needed, system.md §3 rule catalogue)."""
from datetime import date

from app.services.validation.rules import academic_year_window, row_flags

AY_START, AY_END = academic_year_window("2026-27")

GOOD_ROW = {
    "apaar_id": "912345678901",
    "full_name": "Asha Sharma",
    "dob": date(2008, 5, 14),
    "course": "B.Tech Computer Engineering",
    "quota_type": "regular",
    "admission_date": date(2026, 7, 1),
    "category": "GENERAL",
    "nationality": "INDIAN",
}


def codes(flags) -> set[str]:
    return {c for c, _, _ in flags}


def test_good_row_has_no_flags():
    assert row_flags(GOOD_ROW, AY_START, AY_END) == []


def test_apaar_missing():
    row = {**GOOD_ROW, "apaar_id": ""}
    assert "APAAR_MISSING" in codes(row_flags(row, AY_START, AY_END))


def test_apaar_format_bad():
    row = {**GOOD_ROW, "apaar_id": "12AB"}
    assert "APAAR_FORMAT" in codes(row_flags(row, AY_START, AY_END))


def test_required_fields_missing():
    row = {**GOOD_ROW, "full_name": "", "dob": None, "course": None}
    flags = row_flags(row, AY_START, AY_END)
    missing_msgs = [m for c, _, m in flags if c == "FIELD_MISSING"]
    assert len(missing_msgs) == 3


def test_dob_in_future_invalid():
    row = {**GOOD_ROW, "dob": date(2030, 1, 1)}
    assert "DOB_INVALID" in codes(row_flags(row, AY_START, AY_END))


def test_dob_too_young_invalid():
    from datetime import date as d
    row = {**GOOD_ROW, "dob": d(d.today().year - 10, 1, 1)}
    assert "DOB_INVALID" in codes(row_flags(row, AY_START, AY_END))


def test_admission_outside_ay():
    row = {**GOOD_ROW, "admission_date": date(2025, 1, 1)}
    assert "ADMISSION_DATE_INVALID" in codes(row_flags(row, AY_START, AY_END))


def test_category_invalid():
    row = {**GOOD_ROW, "category": "ALPHA"}
    assert "CATEGORY_INVALID" in codes(row_flags(row, AY_START, AY_END))


def test_oci_with_indian_nationality_warns():
    row = {**GOOD_ROW, "quota_type": "oci", "nationality": "INDIAN"}
    flags = row_flags(row, AY_START, AY_END)
    assert "QUOTA_NATIONALITY_MISMATCH" in codes(flags)
    assert all(sev == "warning" for _, sev, _ in flags)


def test_nri_with_indian_nationality_is_ok():
    row = {**GOOD_ROW, "quota_type": "nri", "nationality": "INDIAN"}
    assert "QUOTA_NATIONALITY_MISMATCH" not in codes(row_flags(row, AY_START, AY_END))


def test_fn_with_foreign_nationality_is_ok():
    row = {**GOOD_ROW, "quota_type": "fn", "nationality": "FRENCH"}
    assert row_flags(row, AY_START, AY_END) == []


def test_academic_year_window():
    assert academic_year_window("2026-27") == (date(2026, 4, 1), date(2027, 3, 31))
