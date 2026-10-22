"""Evaluate the detectors against ground_truth.csv (aiml_guide.md §6).

Runs, purely in memory over data/enrollments/dirty, the same checks the upload
engine runs — row rules, registry lookup, in-file and cross-file duplicates,
fuzzy matching, intake aggregates — then scores every detection against the
injected ground truth. Prints the recall/precision table for the pitch.

Also reports the anomaly top-k from the seeded database when reachable.

Usage:
    python scripts/evaluate.py
"""
import csv
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rapidfuzz import fuzz

from app.config import settings
from app.services.validation.rules import APAAR_RE, academic_year_window, row_flags

DATA = Path(__file__).resolve().parents[1] / "data"
AY_START, AY_END = academic_year_window("2026-27")


def _date(v: str | None) -> date | None:
    try:
        return date.fromisoformat((v or "").strip())
    except ValueError:
        return None


def load_rows() -> list[dict]:
    rows = []
    for f in sorted((DATA / "enrollments" / "dirty").glob("*.csv")):
        with open(f, newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                rows.append({
                    "file": f.name,
                    "code": r["student_code"],
                    "apaar_id": (r["apaar_id"] or "").strip(),
                    "passport_no": (r["passport_no"] or "").strip().upper(),
                    "full_name": (r["full_name"] or "").strip(),
                    "dob": _date(r["dob"]),
                    "course": r["branch"],
                    "quota_type": (r["quota_type"] or "").lower(),
                    "admission_date": _date(r["admission_date"]),
                    "category": (r["category"] or "").upper(),
                    "nationality": (r["nationality"] or "").strip().upper(),
                    "_intake": int(r["approved_intake"]),
                    "_supern": int(r["approved_supernumerary"]),
                })
    return rows


def detect(rows: list[dict], registry: set[str]) -> set[tuple]:
    found: set[tuple] = set()

    def add(row: dict, code: str) -> None:
        found.add((row["file"], row["code"], code))

    # step 2: row rules — identical code path to the engine
    for row in rows:
        for code, _sev, _msg in row_flags(row, AY_START, AY_END):
            add(row, code)

    # step 5: registry existence (well-formed ids only)
    for row in rows:
        if APAAR_RE.match(row["apaar_id"]) and row["apaar_id"] not in registry:
            add(row, "APAAR_NOT_FOUND")

    # step 3: DUP_IN_UPLOAD — well-formed id shared inside one file
    per_file = defaultdict(Counter)
    for row in rows:
        if APAAR_RE.match(row["apaar_id"]):
            per_file[row["file"]][row["apaar_id"]] += 1
    for row in rows:
        if per_file[row["file"]][row["apaar_id"]] > 1:
            add(row, "DUP_IN_UPLOAD")

    # step 4: DUP_CROSS_INSTITUTION — same id in two or more files
    by_apaar = defaultdict(set)
    for row in rows:
        if APAAR_RE.match(row["apaar_id"]):
            by_apaar[row["apaar_id"]].add(row["file"])
    for row in rows:
        if len(by_apaar.get(row["apaar_id"], ())) > 1:
            add(row, "DUP_CROSS_INSTITUTION")

    # step 6: FUZZY_DUPLICATE — same dob, different id, name >= threshold
    by_dob = defaultdict(list)
    for row in rows:
        if row["dob"] and row["full_name"]:
            by_dob[row["dob"]].append(row)
    for group in by_dob.values():
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                if a["apaar_id"] == b["apaar_id"]:
                    continue  # same id — DUP_* rules own that case
                score = fuzz.token_set_ratio(
                    a["full_name"].lower(), b["full_name"].lower())
                if score >= settings.fuzzy_threshold:
                    add(a, "FUZZY_DUPLICATE")
                    add(b, "FUZZY_DUPLICATE")

    # step 7: intake aggregates, evaluated file-internally
    course_rows = defaultdict(list)
    for row in rows:
        course_rows[(row["file"], row["course"])].append(row)
    for (fname, _course), group in course_rows.items():
        if len(group) > group[0]["_intake"] + group[0]["_supern"]:
            found.add((fname, "*", "INTAKE_EXCEEDED"))
        supn = sum(1 for r in group if r["quota_type"] == "supernumerary")
        if supn > group[0]["_supern"]:
            found.add((fname, "*", "SUPERNUMERARY_EXCEEDED"))
    return found


def load_gt() -> set[tuple]:
    with open(DATA / "ground_truth.csv", newline="", encoding="utf-8") as fh:
        return {(r["file"], r["student_code"], r["rule_code"])
                for r in csv.DictReader(fh)}


def score(found: set[tuple], gt: set[tuple]) -> None:
    matched = found & gt
    print(f"\nrule engine recall:    {len(matched)}/{len(gt)} = "
          f"{100 * len(matched) / len(gt):.1f}%   (target 100%)")
    print(f"precision (all rules): {len(matched)}/{len(found)} = "
          f"{100 * len(matched) / max(len(found), 1):.1f}%")

    print("\nper rule:")
    print(f"  {'rule':28} {'gt':>4} {'detected':>8} {'hit':>4}")
    rules = sorted({r for _, _, r in gt | found})
    for rule in rules:
        g = sum(1 for r in gt if r[2] == rule)
        d = sum(1 for r in found if r[2] == rule)
        h = sum(1 for r in matched if r[2] == rule)
        print(f"  {rule:28} {g:>4} {d:>8} {h:>4}")

    fz_g = {r for r in gt if r[2] == "FUZZY_DUPLICATE"}
    fz_d = {r for r in found if r[2] == "FUZZY_DUPLICATE"}
    fz_h = fz_g & fz_d
    if fz_g:
        print(f"\nfuzzy duplicates:      recall {100 * len(fz_h) / len(fz_g):.0f}%  "
              f"precision {100 * len(fz_h) / max(len(fz_d), 1):.0f}%   "
              f"(target: both above 90%)")

    extras = found - gt
    print(f"\nextra detections not in ground truth: {len(extras)}")
    for e in sorted(extras)[:10]:
        print("  +", e)


def anomaly_topk() -> None:
    """aiml_guide §6: seeded anomalous institutions found in top-k."""
    try:
        from sqlalchemy import select

        from app.db import SessionLocal
        from app.models import AnomalyScore, Course, Institution

        db = SessionLocal()
        try:
            rows = db.execute(
                select(AnomalyScore.score, Institution.name, Course.name)
                .join(Course, Course.id == AnomalyScore.course_id)
                .join(Institution, Institution.id == AnomalyScore.institution_id)
                .order_by(AnomalyScore.score.desc()).limit(15)
            ).all()
        finally:
            db.close()
    except Exception as exc:
        print(f"\nanomaly top-k: skipped (database unreachable: {exc})")
        return

    # seeded anomalies: RMD Sinhgad (yoy spike, all courses), the two intake
    # breaches (MIT M.Sc 65/60, COEP AI&ML supern 6/4) and the ABC fixture
    # (CS seeded at 47/40 + the fixture's unusual quota mix)
    planted_inst = {"RMD Sinhgad Technical Institutes Campus",
                    "ABC College of Engineering"}
    planted_courses = {("MIT Arts, Commerce & Science College (MIT ACSC)",
                        "M.Sc. Computer Science"),
                       ("COEP Technological University",
                        "AI and Machine Learning (AI&ML)")}
    hits = sum(1 for s, i, c in rows
               if i in planted_inst or (i, c) in planted_courses)
    print(f"\nanomaly top-15: {hits} of the planted anomaly courses present "
          f"(target: all found)")
    for s, i, c in rows[:10]:
        mark = "*" if (i in planted_inst or (i, c) in planted_courses) else " "
        print(f"  {mark} {s:.3f}  {i[:44]:44} {c[:34]}")


if __name__ == "__main__":
    rows = load_rows()
    with open(DATA / "apaar_registry.csv", newline="", encoding="utf-8") as fh:
        registry = {r["apaar_id"] for r in csv.DictReader(fh)}
    gt = load_gt()
    found = detect(rows, registry)
    print(f"[eval] {len(rows)} dirty rows, {len(gt)} ground-truth injections")
    score(found, gt)
    anomaly_topk()
