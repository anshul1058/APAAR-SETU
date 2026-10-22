"""Seed the database with the APAAR-SETU dataset (backend_guide.md §13 step 1).

Data (deterministic output of scripts/generate_synthetic.py + scripts/
generate_enrollments.py, seed=42):

  data/apaar_registry.csv         15,000 known APAAR IDs (mock national registry)
  data/enrollments/clean/*.csv    10 Pune colleges, 80 courses, 11,556 students
  data/synthetic/students.csv     203-row upload fixture -> ABC College (e2e tests)

Seeds institutions, users (all roles), courses, students, apaar_registry,
two prior years of enrolment_history (feeds yoy_growth) and anomaly scores,
plus deliberate demo cases:
  * 3 cross-institution duplicate enrolments (v_duplicate_enrolments)
  * MIT ACSC M.Sc Computer Science: 65 enrolled vs 60 approved (INTAKE_EXCEEDED)
  * COEP AI&ML: 6 supernumerary vs 4 approved (SUPERNUMERARY_EXCEEDED)

ABC College of Engineering is a small fixture institution so the synthetic
upload fixture (tests/test_e2e.py) has a home; the 10 real colleges are the
actual dataset.

Usage:
    python scripts/seed.py            # seed (skips if data already present)
    python scripts/seed.py --reset    # wipe views + all tables first
                                     # (views are recreated by scripts/init_db.py)
    python scripts/seed.py --history  # (re)add enrolment history + anomaly scores
"""
import csv
import random
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from faker import Faker
from sqlalchemy import func, insert, select, text

from app.db import Base, SessionLocal, engine
from app.models import (
    APAARRecord,
    Course,
    EnrolmentHistory,
    Institution,
    Student,
    User,
    STATUS_FLAGGED,
    STATUS_VALID,
)
from app.security import hash_password

DEMO_PASSWORD = "password123"
ACADEMIC_YEAR = "2026-27"
DATA = Path(__file__).resolve().parents[1] / "data"
ABC_NAME = "ABC College of Engineering"
VIEWS = ("v_course_intake_status", "v_duplicate_enrolments",
         "v_flag_summary", "v_institution_summary")

fake = Faker("en_IN")
Faker.seed(42)
random.seed(42)


def _passport() -> str:
    # same simplified pattern as generate_enrollments.py: letter + 7 digits
    return random.choice("ABCFGHJKLMNPRSTUVWXYZ") + f"{random.randint(0, 9999999):07d}"


def _new_apaar(existing: set[str]) -> str:
    while True:
        aid = "9" + "".join(str(random.randint(0, 9)) for _ in range(11))
        if aid not in existing:
            existing.add(aid)
            return aid


def _read_csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _bulk(db, model, rows: list[dict], chunk: int = 1000) -> None:
    """Multi-row INSERTs — one roundtrip per chunk, fast over the remote pooler."""
    for i in range(0, len(rows), chunk):
        db.execute(insert(model), rows[i:i + chunk])


def reset_db() -> None:
    print("[seed] --reset: dropping views + all tables, recreating tables")
    with engine.begin() as conn:
        for v in VIEWS:
            conn.execute(text(f"DROP VIEW IF EXISTS {v} CASCADE"))
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


# name of the institution with the planted +200% year-on-year admission spike
SPIKE_INSTITUTION = "RMD Sinhgad Technical Institutes Campus"
HISTORY_YEARS = (("2024-25", 0.72, 0.90), ("2025-26", 0.80, 0.98))


def seed_history(db) -> int:
    """Two prior years of enrolment per course (aiml_guide.md §3 yoy_growth).

    RMD Sinhgad's history is planted at ~1/3 of its current intake — an
    abnormal admission spike — which combined with its naturally highest NRI
    share (9.1% vs 5-7% elsewhere) makes it the anomaly the detector must find.
    Returns the number of rows inserted (0 if history already exists).
    """
    if db.execute(select(EnrolmentHistory.id)).first():
        return 0
    rng = random.Random(42)  # local RNG: history is identical on every path
    now = dict(db.execute(
        select(Student.course_id, func.count())
        .where(Student.status.in_([STATUS_VALID, STATUS_FLAGGED]))
        .group_by(Student.course_id)
    ).all())
    courses = db.execute(
        select(Course, Institution.name)
        .join(Institution, Institution.id == Course.institution_id)
    ).all()
    rows = []
    for course, inst_name in courses:
        cur = now.get(course.id, 0)
        for ay, lo, hi in HISTORY_YEARS:
            lo_, hi_ = (0.28, 0.34) if inst_name == SPIKE_INSTITUTION else (lo, hi)
            rows.append(dict(
                course_id=course.id, academic_year=ay,
                enrolled=max(int(cur * rng.uniform(lo_, hi_)), 1),
            ))
    _bulk(db, EnrolmentHistory, rows)
    return len(rows)


def seed() -> None:
    registry = _read_csv(DATA / "apaar_registry.csv")
    registry_ids = {r["apaar_id"] for r in registry}
    colleges = []  # (slug, name, rows) per real college, sorted by file name
    for f in sorted((DATA / "enrollments" / "clean").glob("*.csv")):
        rows = _read_csv(f)
        colleges.append((f.stem.lower(), rows[0]["college"], rows))

    db = SessionLocal()
    try:
        if db.execute(select(Institution.id)).first():
            print("[seed] institutions already present — use --reset to reseed")
            return

        # --- institutions ---------------------------------------------------
        inst_rows = [
            dict(name=name, state="Maharashtra", aicte_code=f"IC-{i:04d}")
            for i, (_, name, _) in enumerate(colleges, start=1)
        ]
        inst_rows.append(dict(name=ABC_NAME, state="Maharashtra", aicte_code="IC-9001"))
        _bulk(db, Institution, inst_rows)
        inst_id = dict(db.execute(select(Institution.name, Institution.id)).all())
        abc = inst_id[ABC_NAME]
        print(f"[seed] institutions: {len(colleges)} real + 1 fixture ({ABC_NAME})")

        # --- users (system.md §1 roles) -------------------------------------
        pw = hash_password(DEMO_PASSWORD)
        user_rows = [
            dict(email="aicte.admin@gov.in", role="aicte_admin", password_hash=pw),
            dict(email="aicte.officer@gov.in", role="aicte_officer", password_hash=pw),
            dict(email="verifier@verify.in", role="verifier", password_hash=pw),
            dict(email="admin@abc.in", role="institution_admin",
                 institution_id=abc, password_hash=pw),
        ]
        user_rows += [
            dict(email=f"admin@{slug}.in", role="institution_admin",
                 institution_id=inst_id[name], password_hash=pw)
            for slug, name, _ in colleges
        ]
        _bulk(db, User, user_rows)
        print(f"[seed] users: {len(user_rows)} (password for all: {DEMO_PASSWORD})")

        # --- courses --------------------------------------------------------
        course_rows = []
        for _, inst_name, rows in colleges:
            iid, seen = inst_id[inst_name], set()
            for r in rows:
                if r["branch"] in seen:
                    continue
                seen.add(r["branch"])
                course_rows.append(dict(
                    institution_id=iid, name=r["branch"], branch=r["branch"],
                    academic_year=r["academic_year"],
                    approved_intake=int(r["approved_intake"]),
                    approved_supernumerary=int(r["approved_supernumerary"]),
                ))
        course_rows += [
            dict(institution_id=abc, name="B.Tech Computer Engineering",
                 branch="B.Tech Computer Engineering", academic_year=ACADEMIC_YEAR,
                 approved_intake=40, approved_supernumerary=0),
            dict(institution_id=abc, name="B.Tech Mechanical Engineering",
                 branch="B.Tech Mechanical Engineering", academic_year=ACADEMIC_YEAR,
                 approved_intake=60, approved_supernumerary=0),
        ]
        _bulk(db, Course, course_rows)
        cid = {
            (iid, name): c_id
            for iid, name, c_id in db.execute(
                select(Course.institution_id, Course.name, Course.id)).all()
        }
        print(f"[seed] courses: {len(course_rows)} (AY {ACADEMIC_YEAR})")

        # --- students: clean per-college files -------------------------------
        used_apaar: set[str] = set()
        student_rows = []
        for _, inst_name, rows in colleges:
            iid = inst_id[inst_name]
            for r in rows:
                student_rows.append(dict(
                    apaar_id=r["apaar_id"] or None,
                    passport_no=r["passport_no"] or None,
                    institution_id=iid,
                    course_id=cid[(iid, r["branch"])],
                    student_code=r["student_code"],
                    full_name=r["full_name"],
                    dob=date.fromisoformat(r["dob"]),
                    gender=r["gender"],
                    category=r["category"],
                    quota_type=r["quota_type"],
                    nationality=r["nationality"],
                    admission_date=date.fromisoformat(r["admission_date"]),
                    email_hash="",
                    status=STATUS_VALID,
                ))
                if r["apaar_id"]:
                    used_apaar.add(r["apaar_id"])

        missing = used_apaar - registry_ids
        assert not missing, f"{len(missing)} enrolled APAARs absent from apaar_registry.csv"

        # --- students: ABC upload fixture (tests/test_e2e.py) ----------------
        for branch, n in (("B.Tech Computer Engineering", 47),
                          ("B.Tech Mechanical Engineering", 55)):
            for _ in range(n):
                quota = random.choices(
                    ["regular", "supernumerary", "nri", "oci", "fn"],
                    weights=[80, 12, 4, 2, 2])[0]
                foreign = quota in {"nri", "oci", "fn"}
                student_rows.append(dict(
                    apaar_id=None if foreign else _new_apaar(used_apaar),
                    passport_no=_passport() if foreign else None,
                    institution_id=abc,
                    course_id=cid[(abc, branch)],
                    student_code=f"ST{random.randint(10000, 99999)}",
                    full_name=fake.name(),
                    dob=fake.date_between_dates(date(2001, 1, 1), date(2009, 12, 31)),
                    gender=random.choice(["M", "F", "O"]),
                    category=random.choice(["GENERAL", "OBC", "SC", "ST", "EWS"]),
                    quota_type=quota,
                    nationality="FRENCH" if quota == "fn" else "INDIAN",
                    admission_date=fake.date_between_dates(date(2026, 4, 1), date(2027, 3, 31)),
                    email_hash="",
                    status=STATUS_VALID,
                ))
        _bulk(db, Student, student_rows)
        print(f"[seed] students: {len(student_rows)}")

        # --- deliberate demo cases -------------------------------------------
        mit = inst_id["MIT Arts, Commerce & Science College (MIT ACSC)"]
        coep = inst_id["COEP Technological University"]
        mit_msc = cid[(mit, "M.Sc. Computer Science")]
        coep_ai = cid[(coep, "AI and Machine Learning (AI&ML)")]

        # reserve = registry ids never enrolled (fresh names/dobs from registry)
        reserve = [r for r in registry if r["apaar_id"] not in used_apaar]
        assert len(reserve) >= 8, "registry reserve too small for demo plantings"

        def fresh(rec: dict, iid: int, course: int, quota: str, code: str) -> dict:
            return dict(
                apaar_id=rec["apaar_id"], passport_no=None,
                institution_id=iid, course_id=course, student_code=code,
                full_name=rec["full_name"], dob=date.fromisoformat(rec["dob"]),
                gender=random.choice(["M", "F"]),
                category=random.choice(["GENERAL", "OBC", "SC", "ST"]),
                quota_type=quota, nationality="INDIAN",
                admission_date=date(2026, 7, 1), email_hash="",
                status=STATUS_FLAGGED,
            )

        # MIT ACSC M.Sc CS: 60 (clean) + 4 fresh + 1 dup = 65 > 60 approved
        planted = [fresh(reserve[i], mit, mit_msc, "regular", f"ST9000{i}")
                   for i in range(4)]
        # COEP AI&ML: supernumerary 2 (clean) + 4 fresh = 6 > 4 approved
        planted += [fresh(reserve[4 + i], coep, coep_ai, "supernumerary", f"ST9004{i}")
                    for i in range(4)]

        def dup(donor, iid: int, course: int, code: str) -> dict:
            return dict(
                apaar_id=donor.apaar_id, passport_no=None,
                institution_id=iid, course_id=course, student_code=code,
                full_name=donor.full_name, dob=donor.dob, gender=donor.gender,
                category=donor.category, quota_type="regular",
                nationality=donor.nationality, admission_date=date(2026, 7, 15),
                email_hash=donor.email_hash, status=STATUS_FLAGGED,
            )

        def donor_except(iid: int, skip: int = 0):
            return db.execute(
                select(Student).where(
                    Student.apaar_id.is_not(None),
                    Student.institution_id != iid,
                ).order_by(Student.id).offset(skip).limit(1)
            ).scalars().first()

        planted.append(dup(donor_except(mit), mit, mit_msc, "ST99001"))
        planted.append(dup(donor_except(coep), coep, coep_ai, "ST99002"))
        planted.append(dup(donor_except(coep, skip=1), coep, coep_ai, "ST99003"))
        _bulk(db, Student, planted)
        print("[seed] demo cases: 3 cross-institution duplicates, "
              "M.Sc CS 65/60, COEP AI&ML supernumerary 6/4")

        # --- APAAR registry (mock national service) --------------------------
        _bulk(db, APAARRecord, [
            dict(apaar_id=r["apaar_id"], full_name=r["full_name"],
                 dob=date.fromisoformat(r["dob"]))
            for r in registry
        ])
        print(f"[seed] apaar_registry: {len(registry)}")

        # --- self-checks: the planted reality dashboards assert on -----------
        active = Student.status.in_([STATUS_VALID, STATUS_FLAGGED])
        msc = db.execute(select(func.count()).select_from(Student)
                         .where(Student.course_id == mit_msc, active)).scalar()
        supn = db.execute(select(func.count()).select_from(Student)
                          .where(Student.course_id == coep_ai,
                                 Student.quota_type == "supernumerary",
                                 active)).scalar()
        n_dupes = len(db.execute(
            select(Student.apaar_id)
            .where(active, Student.apaar_id.is_not(None))
            .group_by(Student.apaar_id)
            .having(func.count(func.distinct(Student.institution_id)) > 1)
        ).all())
        assert msc == 65, f"MIT ACSC M.Sc CS should be 65 enrolled, got {msc}"
        assert supn == 6, f"COEP AI&ML supernumerary should be 6, got {supn}"
        assert n_dupes >= 3, f"expected >=3 cross-institution duplicates, got {n_dupes}"

        # --- anomaly scores (aiml_guide §3) so dashboards are live ------------
        n_hist = seed_history(db)
        from app.services.analytics.anomaly import compute_anomalies
        n_scores = compute_anomalies(db, ACADEMIC_YEAR)

        db.commit()
        print(f"[seed] enrolment_history: {n_hist} rows | anomaly_scores: {n_scores}")
        print("[seed] done — run scripts/init_db.py to (re)create views + grants")
    finally:
        db.close()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)  # idempotent: creates tables added to models since
    if "--reset" in sys.argv:
        reset_db()
    if "--history" in sys.argv:
        db = SessionLocal()
        try:
            n = seed_history(db)
            from app.services.analytics.anomaly import compute_anomalies
            s = compute_anomalies(db, ACADEMIC_YEAR)
            db.commit()
            print(f"[seed] enrolment_history: {n} rows | anomaly_scores: {s}")
        finally:
            db.close()
    else:
        seed()
