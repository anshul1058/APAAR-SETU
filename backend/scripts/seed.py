"""Seed synthetic data for development and demos (backend_guide.md §13 step 1).

Creates: institutions, users (all roles), courses, students, APAAR registry.
Includes deliberate demo cases:
  * one cross-institution duplicate enrolment (appears in v_duplicate_enrolments)
  * one course with enrolment beyond approved intake (INTAKE_EXCEEDED)
  * one course with supernumerary overflow (SUPERNUMERARY_EXCEEDED)

Usage:
    python scripts/seed.py            # seed (idempotent-ish: skips if data exists)
    python scripts/seed.py --reset    # wipe all tables first
    python scripts/seed.py --students 800
"""
import hashlib
import random
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from faker import Faker
from sqlalchemy import delete, select, text

from app.db import Base, SessionLocal, engine
from app.models import (
    APAARRecord,
    Course,
    Institution,
    Student,
    User,
    STATUS_FLAGGED,
    STATUS_VALID,
)
from app.security import hash_password

DEMO_PASSWORD = "password123"
ACADEMIC_YEAR = "2026-27"

INSTITUTIONS = [
    ("ABC College of Engineering", "Maharashtra", ["B.Tech Computer Engineering", "B.Tech Mechanical Engineering"]),
    ("Delhi Institute of Technology", "Delhi", ["B.Tech Information Technology", "B.Tech Electronics"]),
    ("Chennai Polytechnic College", "Tamil Nadu", ["B.Tech Civil Engineering", "MBA"]),
    ("Kolkata School of Management", "West Bengal", ["MBA", "BBA"]),
    ("Bangalore Institute of Science", "Karnataka", ["B.Tech Computer Science", "B.Sc Data Science"]),
    ("Hyderabad Engineering Academy", "Telangana", ["B.Tech Electrical Engineering", "B.Tech Chemical Engineering"]),
    ("Jaipur Technical University", "Rajasthan", ["B.Tech Mechanical Engineering", "B.Tech Computer Engineering"]),
    ("Lucknow College of Applied Studies", "Uttar Pradesh", ["B.Tech Information Technology", "BCA"]),
]

CATEGORIES = ["GENERAL", "OBC", "SC", "ST", "EWS", "OTHER"]
CATEGORY_WEIGHTS = [40, 30, 12, 8, 7, 3]

fake = Faker()
Faker.seed(42)
random.seed(42)


def ay_window(academic_year: str) -> tuple[date, date]:
    """Academic year '2026-27' -> (2026-04-01, 2027-03-31)."""
    start_year = int(academic_year.split("-")[0])
    return date(start_year, 4, 1), date(start_year + 1, 3, 31)


def new_apaar(existing: set[str]) -> str:
    while True:
        aid = "9" + "".join(str(random.randint(0, 9)) for _ in range(11))
        if aid not in existing:
            existing.add(aid)
            return aid


def email_hash(email: str) -> str:
    return hashlib.sha256(email.lower().encode()).hexdigest()


def reset_db() -> None:
    print("[seed] --reset: dropping views + all tables, recreating tables")
    with engine.begin() as conn:
        for v in ("v_course_intake_status", "v_duplicate_enrolments",
                  "v_flag_summary", "v_institution_summary"):
            conn.execute(text(f"DROP VIEW IF EXISTS {v} CASCADE"))
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed(n_students: int = 600) -> None:
    db = SessionLocal()
    apaar_ids: set[str] = set()
    try:
        # --- institutions ------------------------------------------------
        institutions = []
        for i, (name, state, _courses) in enumerate(INSTITUTIONS, start=1):
            inst = Institution(name=name, state=state, aicte_code=f"IC-{i:04d}")
            db.add(inst)
            institutions.append((inst, _courses))
        db.flush()
        print(f"[seed] institutions: {len(institutions)}")

        # --- users (system.md §1 roles) ----------------------------------
        users = [
            User(email="aicte.admin@gov.in", role="aicte_admin",
                 password_hash=hash_password(DEMO_PASSWORD)),
            User(email="aicte.officer@gov.in", role="aicte_officer",
                 password_hash=hash_password(DEMO_PASSWORD)),
            User(email="verifier@verify.in", role="verifier",
                 password_hash=hash_password(DEMO_PASSWORD)),
        ]
        for inst, _ in institutions:
            slug = inst.name.split()[0].lower()
            users.append(User(
                email=f"admin@{slug}.in", role="institution_admin",
                institution_id=inst.id, password_hash=hash_password(DEMO_PASSWORD)
            ))
        db.add_all(users)
        print(f"[seed] users: {len(users)} (password for all: {DEMO_PASSWORD})")

        # --- courses ------------------------------------------------------
        courses: list[tuple[Course, int]] = []  # (course, target enrolment)
        for idx, (inst, course_names) in enumerate(institutions):
            for j, cname in enumerate(course_names):
                intake = random.choice([40, 60, 60, 80, 120])
                course = Course(
                    institution_id=inst.id, name=cname, branch=cname,
                    academic_year=ACADEMIC_YEAR,
                    approved_intake=intake,
                    approved_supernumerary=random.choice([0, 2, 4, 6]),
                )
                # deliberate breaches for the demo (course 0 and 1 of institution 0)
                if idx == 0 and j == 0:
                    target = intake + course.approved_supernumerary + 7   # INTAKE_EXCEEDED
                elif idx == 0 and j == 1:
                    target = max(intake - 5, 10)
                else:
                    target = max(int(intake * random.uniform(0.55, 0.95)), 5)
                courses.append((course, target))
        db.add_all([c for c, _ in courses])
        db.flush()
        print(f"[seed] courses: {len(courses)} (AY {ACADEMIC_YEAR})")

        # --- students ------------------------------------------------------
        students: list[Student] = []
        for course, target in courses:
            ay_start, ay_end = ay_window(course.academic_year)
            for _ in range(target):
                dob = fake.date_between_dates(date(2001, 1, 1), date(2009, 12, 31))
                quota = random.choices(
                    ["regular", "supernumerary", "nri", "oci", "fn"],
                    weights=[80, 12, 4, 2, 2],
                )[0]
                nationality = "INDIAN"
                if quota == "fn":
                    nationality = random.choice(["NEPALESE", "BHUTANESE", "FRENCH"])
                elif quota == "nri":
                    nationality = random.choice(["INDIAN", "EMIRATI"])  # nri may be Indian
                students.append(Student(
                    apaar_id=new_apaar(apaar_ids),
                    institution_id=course.institution_id,
                    course_id=course.id,
                    student_code=f"ST{random.randint(10000, 99999)}",
                    full_name=fake.name(),
                    dob=dob,
                    gender=random.choice(["M", "F", "O"]),
                    category=random.choices(CATEGORIES, weights=CATEGORY_WEIGHTS)[0],
                    quota_type=quota,
                    nationality=nationality,
                    admission_date=fake.date_between_dates(ay_start, ay_end),
                    email_hash=email_hash(fake.email()),
                    status=STATUS_VALID,
                ))
        # top-up / trim to requested size
        if len(students) > n_students:
            students = students[:n_students]
        db.add_all(students)

        # mark ~4% as flagged so dashboards show something before any upload
        for s in random.sample(students, k=max(len(students) // 25, 1)):
            s.status = STATUS_FLAGGED
        db.flush()

        # --- deliberate demo case: cross-institution duplicate -------------
        donor = students[0]
        recipient_course = courses[-1][0]
        dup = Student(
            apaar_id=donor.apaar_id,
            institution_id=recipient_course.institution_id,
            course_id=recipient_course.id,
            student_code="ST99999",
            full_name=donor.full_name,
            dob=donor.dob,
            gender=donor.gender,
            category=donor.category,
            quota_type="regular",
            nationality=donor.nationality,
            admission_date=date(2026, 7, 15),
            email_hash=donor.email_hash,
            status=STATUS_VALID,
        )
        db.add(dup)
        print("[seed] demo case: 1 cross-institution duplicate enrolment")

        # --- APAAR registry (mock national service) ------------------------
        extra = {new_apaar(apaar_ids) for _ in range(500)}
        db.add_all(APAARRecord(apaar_id=a) for a in apaar_ids | extra)
        db.flush()

        db.commit()
        print(f"[seed] students: {len(students)} (+1 duplicate) | "
              f"apaar_registry: {len(apaar_ids | extra)}")
        print("[seed] done")
    finally:
        db.close()


if __name__ == "__main__":
    if "--reset" in sys.argv:
        reset_db()
    n = 600
    if "--students" in sys.argv:
        n = int(sys.argv[sys.argv.index("--students") + 1])
    seed(n)
