"""Generate per-college enrolment datasets (step 2 of the synthetic data).

Inputs:  data/Pune_College_Seat_Intake.xlsx   (colleges, courses, seats)
         data/apaar_registry.csv              (step 1 master registry)

Outputs: data/enrollments/clean/<college>.csv  rule-clean uploads
         data/enrollments/dirty/<college>.csv  same rows + seeded errors
         data/ground_truth.csv                 expected rule code per injection

Run:  python scripts/generate_enrollments.py
"""
import copy
import csv
import random
import re
from pathlib import Path

import pandas as pd

DATA = Path(__file__).resolve().parent.parent / "data"
SEED = 42
ACADEMIC_YEAR = "2026-27"
CATEGORIES = ["GENERAL", "OBC", "SC", "ST", "EWS"]
QUOTAS = ["regular"] * 90 + ["supernumerary"] * 4 + ["nri"] * 3 + ["oci"] * 2 + ["fn"] * 1
FOREIGN_QUOTAS = {"nri", "oci", "fn"}  # no APAAR ID - passport is their primary id

FIELDS = ["apaar_id", "passport_no", "full_name", "dob", "gender", "student_code",
          "college", "location", "mht_cet_code", "program_level", "branch",
          "academic_year", "approved_intake", "approved_supernumerary",
          "quota_type", "category", "nationality", "admission_date"]

_seen_passports = set()


def new_passport():
    # Simplified demo pattern (Indian style): letter + 7 digits, always unique
    while True:
        p = random.choice("ABCFGHJKLMNPRSTUVWXYZ") + f"{random.randint(0, 9999999):07d}"
        if p not in _seen_passports:
            _seen_passports.add(p)
            return p


def id_fields(quota, apaar_id):
    return ("", new_passport()) if quota in FOREIGN_QUOTAS else (apaar_id, "")


def has_apaar(row):
    return bool(re.fullmatch(r"\d{12}", row["apaar_id"] or ""))


def slug(name):
    return re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_")[:60]


def admission_date():
    return f"2026-{random.randint(7, 9):02d}-{random.randint(1, 28):02d}"


def quota_fields():
    q = random.choice(QUOTAS)
    nat = {"fn": "FOREIGN", "oci": "OCI"}.get(q, "INDIAN")
    return q, nat


def typo(name):
    # Drop the 3rd char of the FIRST name only (never a space, never the
    # surname) -> fuzz.token_sort_ratio stays comfortably >= 90 (doc threshold).
    first, last = name.split(" ", 1)
    if len(first) > 2:
        first = first[:2] + first[3:]
    elif len(last) > 2:
        last = last[:2] + last[3:]
    else:
        first += "a"  # both tokens tiny; one insertion still lands >= 90
    return f"{first} {last}"


def load_intake():
    df = pd.read_excel(DATA / "Pune_College_Seat_Intake.xlsx")
    # Drop note rows (null College), the in-sheet grand TOTAL row (null Branch),
    # and anything without seats. True totals: 10 colleges, 80 courses, 11,556 seats.
    df = df.dropna(subset=["College", "Total Seats", "Branch / Course"])
    df = df[df["College"].str.strip().str.upper() != "TOTAL"]
    df["MHT CET Code"] = df["MHT CET Code"].astype("object").fillna("").astype(str).str.replace(r"\.0$", "", regex=True)
    df["Location"] = df["Location"].fillna("")
    df["Program Level"] = df["Program Level"].fillna("")
    return df


def load_registry():
    return list(csv.DictReader((DATA / "apaar_registry.csv").open()))


def build_clean(intake, registry):
    pool = registry[:]
    random.shuffle(pool)
    files, counts, intake_map = {}, {}, {}
    # clean must be fuzzy-clean too: reject same-dob students whose names are
    # >= 90 similar (Faker occasionally emits e.g. "Anya"/"Maya Bhattacharyya")
    names_by_dob = {}

    def fuzzy_clash(s):
        import difflib
        cands = names_by_dob.get(s["dob"], [])
        return any(difflib.SequenceMatcher(None, s["full_name"].lower(), n.lower()).ratio() >= 0.90
                   for n in cands)

    for college, grp in intake.groupby("College", sort=True):
        key = slug(college)
        if key in files:
            raise RuntimeError(f"filename collision: {key}")
        rows, seq = [], 0
        for _, c in grp.iterrows():
            branch = c["Branch / Course"]
            total = int(c["Total Seats"])
            cap, tfws = c["CAP Seats (Sanctioned Intake)"], c["TFWS Seats (Additional)"]
            if pd.isna(cap) or pd.isna(tfws):
                approved, supern = total, 0  # MIT ACSC: single intake figure, no CAP/TFWS split
            else:
                approved, supern = int(cap), int(tfws)
            fill = approved + supern  # strict 100% enrolment in clean (per requirement)
            intake_map[(key, branch)] = (approved, supern)
            counts.setdefault(key, {})[branch] = 0
            sup_used = 0
            for _ in range(fill):
                while True:
                    if not pool:
                        raise RuntimeError("registry pool exhausted - lower fill or raise N_STUDENTS")
                    s = pool.pop()
                    if not fuzzy_clash(s):
                        break
                names_by_dob.setdefault(s["dob"], []).append(s["full_name"])
                seq += 1
                quota, nat = quota_fields()
                if quota == "supernumerary":  # clean must never exceed approved TFWS seats
                    if sup_used < supern:
                        sup_used += 1
                    else:
                        quota, nat = "regular", "INDIAN"
                apaar, passport_no = id_fields(quota, s["apaar_id"])
                rows.append({
                    "apaar_id": apaar, "passport_no": passport_no,
                    "full_name": s["full_name"],
                    "dob": s["dob"], "gender": s["gender"],
                    "student_code": f"{key[:4].upper()}{seq:03d}",
                    "college": college, "location": c["Location"],
                    "mht_cet_code": c["MHT CET Code"], "program_level": c["Program Level"],
                    "branch": branch, "academic_year": ACADEMIC_YEAR,
                    "approved_intake": approved, "approved_supernumerary": supern,
                    "quota_type": quota,
                    "category": random.choice(CATEGORIES), "nationality": nat,
                    "admission_date": admission_date(),
                })
                counts[key][branch] += 1
        files[key] = rows
    return files, counts, intake_map, pool


def inject_errors(dirty, counts, intake_map, reserve):
    truth = []  # (file, student_code, rule_code, detail)
    used = set()

    def free(key, code):
        return (key, code) not in used

    all_rows = [(k, i) for k, rs in dirty.items() for i in range(len(rs))]

    # 1. Same student enrolled in TWO colleges -> DUP_CROSS_INSTITUTION.
    #    Clean courses are 100% full, so we OVERWRITE a row in another college
    #    instead of appending - row counts stay at 100% in every file.
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 5:
            break
        src = dirty[src_key][idx]
        if not free(src_key, src["student_code"]) or not has_apaar(src):
            continue
        targets = [(k, i) for (k, i) in all_rows
                   if k != src_key and free(k, dirty[k][i]["student_code"])]
        if not targets:
            continue
        dest_key, dest_idx = random.choice(targets)
        t = dirty[dest_key][dest_idx]
        used.add((dest_key, t["student_code"]))
        # the student now appears here: identity fields follow the person
        t.update(apaar_id=src["apaar_id"], passport_no="",
                 full_name=src["full_name"], dob=src["dob"], gender=src["gender"],
                 # never propagate supernumerary: copying it could push the
                 # receiving course over its TFWS cap (unrecorded rule flag)
                 quota_type="regular" if src["quota_type"] == "supernumerary" else src["quota_type"],
                 nationality=src["nationality"],
                 category=src["category"])
        used.add((src_key, src["student_code"]))
        truth.append((src_key + ".csv", src["student_code"], src["apaar_id"],
                      "DUP_CROSS_INSTITUTION", f"also enrolled at {dest_key}"))
        truth.append((dest_key + ".csv", t["student_code"], src["apaar_id"],
                      "DUP_CROSS_INSTITUTION", f"also enrolled at {src_key}"))
        made += 1

    # 2. Two different people sharing one APAAR ID in one file -> DUP_IN_UPLOAD
    #    (overwrite one row's apaar; counts stay at 100%)
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 3:
            break
        donor = dirty[src_key][idx]
        if not free(src_key, donor["student_code"]) or not has_apaar(donor):
            continue
        targets = [(src_key, i) for i in range(len(dirty[src_key]))
                   if i != idx and free(src_key, dirty[src_key][i]["student_code"])]
        if not targets:
            continue
        _, t_idx = random.choice(targets)
        t = dirty[src_key][t_idx]
        # same apaar as the donor, but a DIFFERENT person (keeps own name/dob)
        t["apaar_id"] = donor["apaar_id"]
        t["passport_no"] = ""
        t["quota_type"], t["nationality"] = (
            "regular" if donor["quota_type"] == "supernumerary" else donor["quota_type"],
            donor["nationality"])
        used.add((src_key, donor["student_code"]))
        used.add((src_key, t["student_code"]))
        truth.append((src_key + ".csv", donor["student_code"], donor["apaar_id"],
                      "DUP_IN_UPLOAD", "shared APAAR ID with another person in this file"))
        truth.append((src_key + ".csv", t["student_code"], t["apaar_id"],
                      "DUP_IN_UPLOAD", "shared APAAR ID with another person in this file"))
        made += 1

    # 3. Fake APAAR IDs -> APAAR_NOT_FOUND / APAAR_FORMAT
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 6:
            break
        if not free(src_key, dirty[src_key][idx]["student_code"]):
            continue
        if not has_apaar(dirty[src_key][idx]):
            continue
        row = dirty[src_key][idx]
        if made % 3 == 2:
            row["apaar_id"] = random.choice(["AB1234567890", "9876543", "1234-5678-9012"])
            truth.append((src_key + ".csv", row["student_code"], row["apaar_id"],
                          "APAAR_FORMAT", "malformed APAAR ID"))
        else:
            row["apaar_id"] = str(random.randint(10**11, 10**12 - 1))
            truth.append((src_key + ".csv", row["student_code"], row["apaar_id"],
                          "APAAR_NOT_FOUND", "valid format but not in APAAR registry"))
        used.add((src_key, row["student_code"]))
        made += 1

    # 4. Missing APAAR ID -> APAAR_MISSING
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 4:
            break
        if not free(src_key, dirty[src_key][idx]["student_code"]):
            continue
        if not has_apaar(dirty[src_key][idx]):  # blank apaar on a passport row is legitimate
            continue
        row = dirty[src_key][idx]
        row["apaar_id"] = ""
        truth.append((src_key + ".csv", row["student_code"], "",
                      "APAAR_MISSING", "APAAR ID left blank"))
        used.add((src_key, row["student_code"]))
        made += 1

    # 5a. Missing name -> FIELD_MISSING
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 2:
            break
        if not free(src_key, dirty[src_key][idx]["student_code"]):
            continue
        row = dirty[src_key][idx]
        row["full_name"] = ""
        truth.append((src_key + ".csv", row["student_code"], row["apaar_id"],
                      "FIELD_MISSING", "full_name empty"))
        used.add((src_key, row["student_code"]))
        made += 1

    # 5b. Same person with a typo'd name in another college -> FUZZY_DUPLICATE
    #    (overwrite the target row; it keeps its own valid IDs, only
    #    name/dob/gender change so the pair matches at the 90 threshold)
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 4:
            break
        src = dirty[src_key][idx]
        if not free(src_key, src["student_code"]):
            continue
        targets = [(k, i) for (k, i) in all_rows
                   if k != src_key and free(k, dirty[k][i]["student_code"])]
        if not targets:
            continue
        dest_key, dest_idx = random.choice(targets)
        t = dirty[dest_key][dest_idx]
        t["full_name"] = typo(src["full_name"])
        t["dob"] = src["dob"]
        t["gender"] = src["gender"]
        used.add((src_key, src["student_code"]))
        used.add((dest_key, t["student_code"]))
        truth.append((src_key + ".csv", src["student_code"], src["apaar_id"],
                      "FUZZY_DUPLICATE", f"likely {t['full_name']} at {dest_key}"))
        truth.append((dest_key + ".csv", t["student_code"], t["apaar_id"],
                      "FUZZY_DUPLICATE",
                      f"likely {src['full_name']} ({src_key}), name typo'd"))
        made += 1

    # 6. Intake breach: one course pushed past sanctioned intake -> INTAKE_EXCEEDED
    #    (everything else stays exactly at 100%)
    small = [(k, b, ai, sn) for (k, b), (ai, sn) in intake_map.items()
             if ai + sn <= 60]
    random.shuffle(small)
    for key, branch, approved, supern in small:
        cap = approved + supern
        need = 5  # 100% + 5 extra admissions
        if len(reserve) < need:
            continue
        seq = len(dirty[key]) + 1
        for _ in range(need):
            s = reserve.pop()
            quota, nat = "regular", "INDIAN"  # extra seats must not skew the supernumerary count
            apaar, passport_no = id_fields(quota, s["apaar_id"])
            dirty[key].append({
                "apaar_id": apaar, "passport_no": passport_no,
                "full_name": s["full_name"],
                "dob": s["dob"], "gender": s["gender"],
                "student_code": f"{key[:4].upper()}{990 + seq}",
                "college": dirty[key][0]["college"], "location": dirty[key][0]["location"],
                "mht_cet_code": dirty[key][0]["mht_cet_code"],
                "program_level": dirty[key][0]["program_level"],
                "branch": branch, "academic_year": ACADEMIC_YEAR,
                "approved_intake": approved, "approved_supernumerary": supern,
                "quota_type": quota,
                "category": random.choice(CATEGORIES), "nationality": nat,
                "admission_date": admission_date(),
            })
            counts[key][branch] += 1
            seq += 1
        truth.append((key + ".csv", "*", "*",
                      "INTAKE_EXCEEDED",
                      f"{key}/{branch}: {counts[key][branch]} enrolled vs {cap} approved"))
        break

    # 7. DOB in the future -> DOB_INVALID (fixed date keeps runs byte-identical)
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 4:
            break
        row = dirty[src_key][idx]
        if not free(src_key, row["student_code"]):
            continue
        row["dob"] = "2027-06-15"
        truth.append((src_key + ".csv", row["student_code"], row["apaar_id"],
                      "DOB_INVALID", "DOB in the future"))
        used.add((src_key, row["student_code"]))
        made += 1

    # 8. Admission date outside the academic year -> ADMISSION_DATE_INVALID
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 4:
            break
        row = dirty[src_key][idx]
        if not free(src_key, row["student_code"]):
            continue
        row["admission_date"] = "2025-05-12"
        truth.append((src_key + ".csv", row["student_code"], row["apaar_id"],
                      "ADMISSION_DATE_INVALID", "outside 2026-27 window"))
        used.add((src_key, row["student_code"]))
        made += 1

    # 9. Category value outside the allowed list -> CATEGORY_INVALID
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 3:
            break
        row = dirty[src_key][idx]
        if not free(src_key, row["student_code"]):
            continue
        row["category"] = "OBC-NCL"
        truth.append((src_key + ".csv", row["student_code"], row["apaar_id"],
                      "CATEGORY_INVALID", "category not in allowed list"))
        used.add((src_key, row["student_code"]))
        made += 1

    # 10. oci/fn quota declared as Indian -> QUOTA_NATIONALITY_MISMATCH
    #     (nri + INDIAN is legitimate, so only oci/fn are targeted)
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 3:
            break
        row = dirty[src_key][idx]
        if not free(src_key, row["student_code"]):
            continue
        if row["quota_type"] not in {"oci", "fn"}:
            continue
        row["nationality"] = "INDIAN"
        truth.append((src_key + ".csv", row["student_code"], row["apaar_id"],
                      "QUOTA_NATIONALITY_MISMATCH",
                      f"{row['quota_type']} quota declared as INDIAN"))
        used.add((src_key, row["student_code"]))
        made += 1

    # 11. Supernumerary admits over approved TFWS seats -> SUPERNUMERARY_EXCEEDED
    #     (flip regular rows in one course to supernumerary, in place)
    for (key, branch), (approved, supern) in sorted(intake_map.items(),
                                                    key=lambda kv: kv[0]):
        if supern == 0:
            continue
        course = [r for r in dirty[key] if r["branch"] == branch]
        cur = sum(1 for r in course if r["quota_type"] == "supernumerary")
        flip = [r for r in course
                if r["quota_type"] == "regular" and free(key, r["student_code"])]
        need = supern + 2 - cur
        if need <= 0 or len(flip) < need:
            continue
        for r in flip[:need]:
            r["quota_type"] = "supernumerary"
            used.add((key, r["student_code"]))
        truth.append((key + ".csv", "*", "*",
                      "SUPERNUMERARY_EXCEEDED",
                      f"{key}/{branch}: {supern + 2} supernumerary vs {supern} approved"))
        break

    # 12. Malformed passport on a foreign-quota row -> PASSPORT_FORMAT
    made = 0
    for src_key, idx in random.sample(all_rows, len(all_rows)):
        if made == 2:
            break
        row = dirty[src_key][idx]
        if not free(src_key, row["student_code"]):
            continue
        if row["quota_type"] not in FOREIGN_QUOTAS:
            continue
        row["passport_no"] = "12345678"  # digits only, no letter
        truth.append((src_key + ".csv", row["student_code"], row["apaar_id"],
                      "PASSPORT_FORMAT", "passport not letter+7 digits"))
        used.add((src_key, row["student_code"]))
        made += 1

    return truth


def self_check(clean, dirty, truth):
    # clean: id consistency, within intake, names present
    for key, rows in clean.items():
        ids, passports = [], []
        for r in rows:
            if r["quota_type"] in FOREIGN_QUOTAS:
                assert r["apaar_id"] == "", f"{key}: nri/oci/fn row has an apaar id"
                assert re.fullmatch(r"[A-Z]\d{7}", r["passport_no"]), f"{key}: bad passport"
                passports.append(r["passport_no"])
            else:
                assert re.fullmatch(r"\d{12}", r["apaar_id"] or ""), f"{key}: bad apaar in clean"
                assert r["passport_no"] == "", f"{key}: indian row has a passport"
                ids.append(r["apaar_id"])
        assert len(ids) == len(set(ids)), f"{key}: dup apaar in clean"
        assert len(passports) == len(set(passports)), f"{key}: dup passport in clean"
        assert all(r["full_name"] for r in rows), f"{key}: empty name in clean"
        per_branch = {}
        caps = {}
        sup_caps = {}
        sup_used = {}
        for r in rows:
            per_branch[r["branch"]] = per_branch.get(r["branch"], 0) + 1
            caps[r["branch"]] = r["approved_intake"] + r["approved_supernumerary"]
            sup_caps[r["branch"]] = r["approved_supernumerary"]
            if r["quota_type"] == "supernumerary":
                sup_used[r["branch"]] = sup_used.get(r["branch"], 0) + 1
            assert per_branch[r["branch"]] <= caps[r["branch"]], f"{key}: intake breach in CLEAN"
        for b, n in per_branch.items():
            assert n == caps[b], f"{key}: {b} is {n}/{caps[b]} - clean must be 100% enrolled"
            assert sup_used.get(b, 0) <= sup_caps[b], \
                f"{key}: {b} has {sup_used.get(b, 0)} supernumerary vs {sup_caps[b]} approved"
    # registry-wide: a clean student (by apaar OR passport) never appears in two colleges
    all_keys = [r["apaar_id"] or r["passport_no"] for rows in clean.values() for r in rows]
    assert len(all_keys) == len(set(all_keys)), "cross-college dup in CLEAN"
    # dirty: strictly more rows than clean (errors were added) and truth is recorded
    for key in dirty:
        assert len(dirty[key]) >= len(clean[key]), f"{key}: rows lost"
    assert truth, "no errors injected"
    codes = {t[3] for t in truth}
    for c in ("DUP_CROSS_INSTITUTION", "DUP_IN_UPLOAD", "APAAR_NOT_FOUND",
              "APAAR_FORMAT", "APAAR_MISSING", "FIELD_MISSING",
              "FUZZY_DUPLICATE", "INTAKE_EXCEEDED", "DOB_INVALID",
              "ADMISSION_DATE_INVALID", "CATEGORY_INVALID",
              "QUOTA_NATIONALITY_MISMATCH", "SUPERNUMERARY_EXCEEDED",
              "PASSPORT_FORMAT"):
        assert c in codes, f"rule {c} never injected"


def write(path, rows, fieldnames=FIELDS):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    random.seed(SEED)
    intake = load_intake()
    registry = load_registry()

    clean, counts, intake_map, pool = build_clean(intake, registry)
    reserve = pool[-300:] if len(pool) >= 300 else pool
    pool = pool[:-len(reserve)] if reserve else pool

    dirty = copy.deepcopy(clean)
    truth = inject_errors(dirty, counts, intake_map, reserve)
    self_check(clean, dirty, truth)

    for key in clean:
        write(DATA / "enrollments" / "clean" / f"{key}.csv", clean[key])
        write(DATA / "enrollments" / "dirty" / f"{key}.csv", dirty[key])
    write(DATA / "ground_truth.csv",
          [{"file": f, "student_code": c, "apaar_id": a, "rule_code": r, "detail": d}
           for f, c, a, r, d in truth],
          fieldnames=["file", "student_code", "apaar_id", "rule_code", "detail"])

    n_clean = sum(len(v) for v in clean.values())
    n_dirty = sum(len(v) for v in dirty.values())
    print(f"colleges: {len(clean)} | clean rows: {n_clean} | dirty rows: {n_dirty}")
    print(f"registry used: {n_clean}/{len(registry)} | reserve left: {len(reserve)}")
    print("injections:")
    from collections import Counter
    for code, n in sorted(Counter(t[3] for t in truth).items()):
        print(f"  {code:24s} {n}")
