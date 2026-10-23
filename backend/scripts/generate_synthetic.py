"""Generate a synthetic students CSV with injected, known errors
(aiml_guide.md §1) for testing the upload endpoint end-to-end.

Outputs into backend/data/synthetic/:
  students.csv       - rows to upload (mix of clean and broken)
  ground_truth.csv   - (student_code, expected_rule_code) for every injection

Usage: python scripts/generate_synthetic.py [--rows 200]
"""
import csv
import random
import sys
from datetime import date, date as date_cls, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from faker import Faker

fake = Faker("en_IN")
random.seed(42)

# course names must exist in the seeded institution (COEP, AY 2026-27) or the
# engine flags every row as FIELD_MISSING ("not an approved course")
COURSES = ["Computer Science and Engineering", "Mechanical Engineering"]
QUOTAS = ["regular"] * 90 + ["supernumerary"] * 4 + ["nri"] * 3 + ["oci"] * 2 + ["fn"] * 1

HEADER = ["apaar_id", "full_name", "dob", "course", "quota_type", "admission_date",
          "student_code", "gender", "category", "nationality"]


def apaar() -> str:
    return "9" + "".join(random.choices("0123456789", k=11))


def make_row() -> dict:
    quota = random.choice(QUOTAS)
    nat = "INDIAN"
    if quota == "fn":
        nat = random.choice(["NEPALESE", "FRENCH"])
    return {
        "apaar_id": apaar(),
        "full_name": fake.name(),
        "dob": fake.date_of_birth(minimum_age=17, maximum_age=24).isoformat(),
        "course": random.choice(COURSES),
        "quota_type": quota,
        "admission_date": date(2026, random.randint(7, 9), random.randint(1, 28)).isoformat(),
        "student_code": fake.bothify("S####??"),
        "gender": random.choice(["M", "F"]),
        "category": random.choice(["GENERAL", "OBC", "SC", "ST", "EWS"]),
        "nationality": nat,
    }


def inject_errors(rows: list[dict]) -> list[tuple[str, str]]:
    truth: list[tuple[str, str]] = []

    for r in random.sample(rows, 4):
        r["apaar_id"] = random.choice(["", "123", "ABCDEFGHIJKL"])
        truth.append((r["student_code"], "APAAR_MISSING/FORMAT"))

    for r in random.sample(rows, 3):                       # DUP_IN_UPLOAD
        dup = dict(r)
        dup["student_code"] += "D"
        rows.append(dup)
        truth.append((dup["student_code"], "DUP_IN_UPLOAD"))

    for r in random.sample(rows, 2):                       # DOB_INVALID
        r["dob"] = (date_cls.today() + timedelta(days=400)).isoformat()
        truth.append((r["student_code"], "DOB_INVALID"))

    for r in random.sample(rows, 2):                       # ADMISSION_DATE_INVALID
        r["admission_date"] = "2024-01-15"
        truth.append((r["student_code"], "ADMISSION_DATE_INVALID"))

    for r in random.sample(rows, 2):                       # QUOTA_NATIONALITY_MISMATCH
        r["quota_type"], r["nationality"] = "oci", "INDIAN"
        truth.append((r["student_code"], "QUOTA_NATIONALITY_MISMATCH"))

    for r in random.sample(rows, 2):                       # CATEGORY_INVALID
        r["category"] = "ALPHA"
        truth.append((r["student_code"], "CATEGORY_INVALID"))

    r = random.choice(rows)                                # FIELD_MISSING
    r["full_name"] = ""
    truth.append((r["student_code"], "FIELD_MISSING"))
    return truth


def main(n_rows: int = 200) -> None:
    out_dir = Path(__file__).resolve().parents[1] / "data" / "synthetic"
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = [make_row() for _ in range(n_rows)]
    truth = inject_errors(rows)

    with open(out_dir / "students.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HEADER)
        w.writeheader()
        for r in rows:
            w.writerow({k: r[k] for k in HEADER})

    with open(out_dir / "ground_truth.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["student_code", "expected_rule"])
        w.writerows(truth)

    print(f"[gen] {len(rows)} rows -> {out_dir / 'students.csv'}")
    print(f"[gen] {len(truth)} injected errors -> {out_dir / 'ground_truth.csv'}")


if __name__ == "__main__":
    n = 200
    if "--rows" in sys.argv:
        n = int(sys.argv[sys.argv.index("--rows") + 1])
    main(n)
