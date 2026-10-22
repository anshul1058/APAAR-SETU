"""File parsing: CSV/Excel -> normalised list-of-dicts (backend_guide.md §7)."""
import io
from datetime import date, datetime

import pandas as pd
from fastapi import HTTPException, UploadFile

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".csv", ".xlsx"}

# column name variants -> canonical name
COLUMN_ALIASES = {
    "apaar_id": "apaar_id", "apaar": "apaar_id", "apaar id": "apaar_id",
    "full_name": "full_name", "name": "full_name", "student_name": "full_name",
    "dob": "dob", "date_of_birth": "dob",
    "gender": "gender",
    "category": "category", "social_category": "category",
    "quota_type": "quota_type", "quota": "quota_type",
    "nationality": "nationality",
    "course": "course", "course_name": "course", "program": "course",
    "branch": "branch",
    "admission_date": "admission_date", "date_of_admission": "admission_date",
    "student_code": "student_code", "roll_no": "student_code",
    "email": "email",
}

REQUIRED_COLUMNS = ["apaar_id", "full_name", "dob", "course", "quota_type", "admission_date"]

TEMPLATE_COLUMNS = REQUIRED_COLUMNS + [
    "student_code", "gender", "category", "nationality", "email", "branch"
]


def template_csv() -> str:
    """Downloadable template with the required columns (backend_guide.md §7)."""
    import pandas as pd

    sample = [{
        "apaar_id": "912345678901", "full_name": "Asha Sharma", "dob": "2008-05-14",
        "course": "B.Tech Computer Engineering", "quota_type": "regular",
        "admission_date": "2026-07-01", "student_code": "ST12345", "gender": "F",
        "category": "GENERAL", "nationality": "INDIAN", "email": "asha@example.com",
        "branch": "Computer Engineering",
    }]
    buf = io.StringIO()
    pd.DataFrame(sample, columns=TEMPLATE_COLUMNS).to_csv(buf, index=False)
    return buf.getvalue()


def _to_date(value) -> date | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return pd.to_datetime(str(value).strip(), dayfirst=False).date()
    except Exception:
        return None


def parse_file(file: UploadFile) -> list[dict]:
    """Parse uploaded CSV/XLSX into normalised row dicts.

    Raises HTTPException(400/413) with a clear message on bad input.
    """
    ext = ("." + file.filename.rsplit(".", 1)[-1].lower()) if "." in (file.filename or "") else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: .csv, .xlsx")

    raw = file.file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large (max 10 MB)")

    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(raw))
        else:
            df = pd.read_excel(io.BytesIO(raw))
    except Exception as exc:
        raise HTTPException(400, f"Could not parse file: {exc}")

    if df.empty:
        raise HTTPException(400, "The file contains no data rows")

    # normalise headers
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    rename = {}
    for col in df.columns:
        if col in COLUMN_ALIASES:
            rename[col] = COLUMN_ALIASES[col]
    df = df.rename(columns=rename)

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise HTTPException(
            400,
            f"Missing required columns: {', '.join(missing)}. "
            "Download the template from GET /api/v1/uploads/template.",
        )

    rows: list[dict] = []
    for r in df.to_dict(orient="records"):
        row = {}
        for k, v in r.items():
            if pd.isna(v) if not isinstance(v, (date, datetime)) else False:
                row[k] = None
            elif isinstance(v, str):
                row[k] = v.strip()
            else:
                row[k] = v
        row["dob"] = _to_date(row.get("dob"))
        row["admission_date"] = _to_date(row.get("admission_date"))
        if row.get("category"):
            row["category"] = str(row["category"]).upper().strip()
        if row.get("quota_type"):
            row["quota_type"] = str(row["quota_type"]).lower().strip()
        row["apaar_id"] = str(row.get("apaar_id") or "").strip()
        rows.append(row)
    return rows
