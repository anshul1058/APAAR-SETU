"""Anomaly detection (aiml_guide.md §3).

Isolation Forest over per course-year features + Z-score explainability.
Scores are min-max normalised to [0, 1]; anything >= ANOMALY_THRESHOLD
is surfaced on the dashboard (and described by the LLM assistant).
"""
import json
from datetime import date

import numpy as np
import pandas as pd
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    AnomalyScore,
    Course,
    EnrolmentHistory,
    Institution,
    STATUS_FLAGGED,
    STATUS_VALID,
    Student,
    ValidationFlag,
    Upload,
)

# scikit-learn may be blocked by endpoint security on some machines
# (Application Control). Fall back to the Z-score baseline from aiml_guide §3.3.
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    HAS_SKLEARN = True
except ImportError:  # pragma: no cover - depends on host policy
    HAS_SKLEARN = False

FEATURE_COLS = [
    "fill_ratio", "yoy_growth", "nri_share", "oci_share", "fn_share",
    "supernumerary_share", "late_admission_share", "flag_rate", "dup_rate",
]


def _course_frame(db: Session, academic_year: str) -> pd.DataFrame:
    """One row per (institution, course) with the features from aiml_guide §3.1."""
    courses = db.execute(
        select(Course, Institution.name.label("institution_name"))
        .join(Institution, Institution.id == Course.institution_id)
        .where(Course.academic_year == academic_year)
    ).all()

    # prior year's enrolment for yoy_growth (synthetic history from seed)
    start = int(academic_year.split("-")[0])
    prev_ay = f"{start - 1}-{str(start)[2:]}"  # "2026-27" -> "2025-26"
    prev_enrolled = dict(db.execute(
        select(EnrolmentHistory.course_id, EnrolmentHistory.enrolled)
        .where(EnrolmentHistory.academic_year == prev_ay)
    ).all())

    records = []
    for course, inst_name in courses:
        students = db.execute(
            select(Student).where(Student.course_id == course.id)
            .where(Student.status.in_([STATUS_VALID, STATUS_FLAGGED]))
        ).scalars().all()
        n = len(students)
        if n == 0:
            continue  # no enrolment (e.g. the ABC upload fixture) — nothing to score
        ay_start, ay_end = int(academic_year.split("-")[0]), None

        approved = max(course.approved_intake + course.approved_supernumerary, 1)
        late_cut = date(int(academic_year.split("-")[0]) + 1, 2, 1)
        flagged = sum(1 for s in students if s.status == STATUS_FLAGGED)

        # duplicate flags for uploads touching this institution this year
        dup_flags = db.execute(
            select(ValidationFlag).join(Upload, Upload.id == ValidationFlag.upload_id)
            .where(Upload.institution_id == course.institution_id)
            .where(ValidationFlag.rule_code.in_(
                ["DUP_IN_UPLOAD", "DUP_IN_INSTITUTION", "DUP_CROSS_INSTITUTION"]))
        ).scalars().all()

        records.append({
            "institution_id": course.institution_id,
            "institution": inst_name,
            "course_id": course.id,
            "course": course.name,
            "academic_year": academic_year,
            "enrolled": n,
            "fill_ratio": n / approved,
            "yoy_growth": (
                (n - prev_enrolled[course.id]) / max(prev_enrolled[course.id], 1)
                if course.id in prev_enrolled else 0.0
            ),
            "nri_share": sum(1 for s in students if s.quota_type == "nri") / max(n, 1),
            "oci_share": sum(1 for s in students if s.quota_type == "oci") / max(n, 1),
            "fn_share": sum(1 for s in students if s.quota_type == "fn") / max(n, 1),
            "supernumerary_share": sum(1 for s in students if s.quota_type == "supernumerary") / max(n, 1),
            "late_admission_share": sum(
                1 for s in students if s.admission_date and s.admission_date >= late_cut
            ) / max(n, 1),
            "flag_rate": flagged / max(n, 1),
            "dup_rate": len(dup_flags) / max(n, 1),
        })
    return pd.DataFrame(records)


def _top_reasons(row: pd.Series, df: pd.DataFrame, k: int = 3) -> list[dict]:
    z = (row[FEATURE_COLS] - df[FEATURE_COLS].mean()) / (df[FEATURE_COLS].std() + 1e-9)
    top = z.abs().sort_values(ascending=False).head(k).index
    return [{"feature": f, "value": float(row[f]), "z": float(z[f])} for f in top]


def compute_anomalies(db: Session, academic_year: str = "2026-27",
                      contamination: float = 0.08) -> int:
    """(Re)score every course-year; store results in anomaly_scores. Returns #rows."""
    df = _course_frame(db, academic_year)
    if df.empty:
        return 0

    if not HAS_SKLEARN or len(df) < 5:
        # Z-score baseline: mean absolute z-score across features, normalised.
        base = df[FEATURE_COLS].fillna(0)
        z = (base - base.mean()) / (base.std() + 1e-9)
        raw = z.abs().mean(axis=1).to_numpy()
        scores = (raw - raw.min()) / (raw.max() - raw.min() + 1e-9)
    else:
        X = StandardScaler().fit_transform(df[FEATURE_COLS].fillna(0))
        iso = IsolationForest(n_estimators=200, contamination=contamination, random_state=42)
        iso.fit(X)
        raw = -iso.score_samples(X)
        scores = (raw - raw.min()) / (raw.max() - raw.min() + 1e-9)
    df["anomaly_score"] = scores

    db.execute(delete(AnomalyScore).where(AnomalyScore.academic_year == academic_year))
    for _, r in df.iterrows():
        db.add(AnomalyScore(
            institution_id=int(r["institution_id"]),
            course_id=int(r["course_id"]),
            academic_year=academic_year,
            score=float(r["anomaly_score"]),
            reasons_json=json.dumps(_top_reasons(r, df)),
        ))
    db.flush()
    return len(df)
