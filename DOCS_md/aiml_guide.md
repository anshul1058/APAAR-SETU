# AI/ML Guide

Approach: **rules enforce, ML detects patterns, the LLM explains.** No model training from scratch.

| Component | Tool | Purpose |
|---|---|---|
| Synthetic data | Faker + error injector | Demo and test data |
| Fuzzy duplicates | RapidFuzz | Same student, different spelling or missing ID |
| Anomaly detection | scikit-learn Isolation Forest + Z-score | Unusual admissions per institution/course |
| LLM | `llama-3.1-8b-instant` on Groq (Ollama `llama3.1:8b` fallback) | Explain errors, text-to-SQL, report summaries |

Rule codes referenced here are defined in `system.md`.

---

## 1. Synthetic data generator

Goal: about 5,000 students across 10 to 15 institutions with known, seeded errors, so every detector can be checked.

```python
# scripts/generate_synthetic.py
import random, csv
from datetime import date, timedelta
from faker import Faker

fake = Faker("en_IN")
random.seed(42)

INSTITUTIONS = [f"INST{i:03d}" for i in range(1, 13)]
COURSES = ["B.Tech Computer Engineering", "B.Tech Mechanical", "B.Tech Civil",
           "B.Pharm", "Diploma Electronics"]
QUOTAS = ["regular"] * 90 + ["supernumerary"] * 4 + ["nri"] * 3 + ["oci"] * 2 + ["fn"] * 1

def apaar():
    return "".join(random.choices("0123456789", k=12))

def make_student(inst, course):
    nat = "INDIAN"
    quota = random.choice(QUOTAS)
    if quota in ("oci", "fn"):
        nat = "FOREIGN" if quota == "fn" else "OCI"
    return {
        "apaar_id": apaar(), "student_code": fake.bothify("S####??"),
        "full_name": fake.name(),
        "dob": fake.date_of_birth(minimum_age=17, maximum_age=24).isoformat(),
        "gender": random.choice(["M", "F"]),
        "institution": inst, "course": course,
        "category": random.choice(["GENERAL", "OBC", "SC", "ST", "EWS"]),
        "quota_type": quota, "nationality": nat,
        "admission_date": date(2026, random.randint(7, 9), random.randint(1, 28)).isoformat(),
    }

def inject_errors(rows):
    # Each injection is logged to ground_truth.csv with the expected rule code
    truth = []
    # 1. Invalid / missing APAAR IDs
    for r in random.sample(rows, 20):
        r["apaar_id"] = random.choice(["", "123", "ABCDEFGHIJKL"])
        truth.append((r["student_code"], "APAAR_MISSING_OR_FORMAT"))
    # 2. Duplicate rows inside one institution
    for r in random.sample(rows, 15):
        dup = dict(r); dup["student_code"] += "D"; rows.append(dup)
        truth.append((dup["student_code"], "DUP_IN_INSTITUTION"))
    # 3. Cross-institution duplicate
    for r in random.sample(rows, 12):
        dup = dict(r); dup["institution"] = random.choice(INSTITUTIONS)
        dup["student_code"] += "X"; rows.append(dup)
        truth.append((dup["student_code"], "DUP_CROSS_INSTITUTION"))
    # 4. Fuzzy duplicate: same person, no APAAR, small name change
    for r in random.sample(rows, 10):
        dup = dict(r); dup["apaar_id"] = ""
        dup["full_name"] = r["full_name"].replace("a", "aa", 1)
        dup["student_code"] += "F"; rows.append(dup)
        truth.append((dup["student_code"], "FUZZY_DUPLICATE"))
    # 5. Bad dates
    for r in random.sample(rows, 8):
        r["dob"] = (date.today() + timedelta(days=400)).isoformat()
        truth.append((r["student_code"], "DOB_INVALID"))
    return rows, truth
```

Also create:
- An intake table where one course gets `approved_intake` lower than the number of students (to trigger `INTAKE_EXCEEDED`).
- One institution with an abnormal admission spike and unusual NRI share (for anomaly detection).
- A `known_apaar_ids` table for the mock APAAR service.

Output: `students.csv`, `institutions.csv`, `courses.csv`, `ground_truth.csv`.

Always label the dataset as synthetic in the UI and the pitch.

## 2. Fuzzy duplicate detection

Use when APAAR ID is missing or differs, to catch the same person entered twice.

```python
from rapidfuzz import fuzz

def is_possible_duplicate(a, b, threshold=90):
    if a["dob"] != b["dob"]:
        return False                               # DOB must match exactly
    name_score = fuzz.token_sort_ratio(a["full_name"].lower(), b["full_name"].lower())
    return name_score >= threshold
```

Efficiency: group by DOB (and optionally by gender) first, then compare only within each group. This avoids O(n^2) across all students.

Output a `FUZZY_DUPLICATE` warning with details: matched record, similarity score, institution. A human at AICTE decides; the system never auto-merges.

Tuning: start at 90, test against `ground_truth.csv`, and report precision and recall in the pitch.

## 3. Anomaly detection

### 3.1 Features per institution-course-year

| Feature | Meaning |
|---|---|
| `fill_ratio` | enrolled / approved intake |
| `yoy_growth` | enrolment change vs last year (synthetic history for 2-3 years) |
| `nri_share`, `oci_share`, `fn_share` | proportion of special-category admits |
| `supernumerary_share` | supernumerary / enrolled |
| `late_admission_share` | admissions in the last days of the window |
| `flag_rate` | flagged rows / total rows |
| `dup_rate` | duplicate flags / total rows |

### 3.2 Model

```python
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

def score_anomalies(df, feature_cols, contamination=0.08):
    X = StandardScaler().fit_transform(df[feature_cols].fillna(0))
    iso = IsolationForest(n_estimators=200, contamination=contamination, random_state=42)
    iso.fit(X)
    raw = -iso.score_samples(X)                        # higher = more anomalous
    df["anomaly_score"] = (raw - raw.min()) / (raw.max() - raw.min() + 1e-9)
    return df
```

### 3.3 Explainability (important for judges)

An anomaly score alone is not enough. Add reasons using Z-scores:

```python
def top_reasons(row, df, feature_cols, k=3):
    z = (row[feature_cols] - df[feature_cols].mean()) / (df[feature_cols].std() + 1e-9)
    top = z.abs().sort_values(ascending=False).head(k).index
    return [{"feature": f, "value": float(row[f]), "z": float(z[f])} for f in top]
```

Store `{score, reasons}` in `anomaly_scores.reasons_json`. Raise `ANOMALY_HIGH` when `score >= ANOMALY_THRESHOLD`.

Simple Z-score rules (for example, `fill_ratio` z > 3) can run alongside as a transparent baseline.

Limitation to state honestly: with synthetic data the model finds injected anomalies by design. Real calibration needs real historical data.

## 4. LLM layer (llama-3.1-8b-instant)

### 4.1 Client

OpenAI-compatible, so the same code works for Groq and Ollama.

```python
# app/services/llm/client.py
from openai import OpenAI
from app.config import settings

client = OpenAI(base_url=settings.llm_url, api_key=settings.llm_key)

def chat(system: str, user: str, temperature=0.1, max_tokens=500) -> str:
    r = client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "system", "content": system},
                  {"role": "user", "content": user}],
        temperature=temperature, max_tokens=max_tokens,
    )
    return r.choices[0].message.content.strip()
```

| Setup | `LLM_URL` | `LLM_KEY` | `LLM_MODEL` |
|---|---|---|---|
| Hosted (Groq) | `https://api.groq.com/openai/v1` | Groq key | `llama-3.1-8b-instant` |
| Local (Ollama) | `http://localhost:11434/v1` | `ollama` | `llama3.1:8b` |

Handle HTTP 429 with a short retry and a friendly "assistant busy" fallback. Cache responses keyed by the prompt hash.

### 4.2 Three jobs for the LLM

1. **Explain validation errors** to institution admins.
2. **Text-to-SQL** over read-only views for AICTE officers.
3. **Summarise computed numbers** into report text.

The LLM never decides whether a record is valid, never receives raw student PII, and never performs arithmetic that goes into a report.

### 4.3 Prompt: error explanation

System prompt:

```
You help college administrators fix student data upload errors for the AICTE portal.
You are given validation errors as JSON (rule code, message, details).
For each distinct rule code, write: what is wrong, why it matters, and how to fix it,
in 1-2 simple sentences. Do not invent rules or facts that are not in the input.
Do not mention or guess any personal data. Output plain text, one bullet per rule code.
```

User message: JSON summary such as `{"APAAR_FORMAT": {"count": 9, "example": "123"}, "INTAKE_EXCEEDED": {"approved": 120, "enrolled": 134}}`.

Pass counts and one masked example per rule, not entire rows.

### 4.4 Prompt: text-to-SQL

System prompt:

```
You convert questions into one PostgreSQL SELECT query.
Use ONLY these views and columns:

v_course_intake_status(institution_id, institution, state, course_id, course,
  academic_year, approved_intake, approved_supernumerary, enrolled,
  supernumerary_enrolled, excess)
v_duplicate_enrolments(apaar_id_masked, institutions)
v_flag_summary(institution, state, rule_code, severity, flag_count)
v_institution_summary(institution, state, total_students, flagged_students,
  anomaly_score)

Rules:
- Output only the SQL, nothing else. No markdown fences, no explanation.
- One statement, SELECT only. Never use INSERT, UPDATE, DELETE, DROP or semicolons
  inside the query.
- Add LIMIT 100 unless the question asks for a count.
- If the question cannot be answered with these views, output exactly: UNSUPPORTED
```

Few-shot examples (add 3 to 5 for reliability):

```
Q: Which colleges exceeded approved intake?
A: SELECT institution, course, approved_intake, enrolled, excess
   FROM v_course_intake_status WHERE excess > 0 ORDER BY excess DESC LIMIT 100

Q: How many students are flagged in Maharashtra?
A: SELECT SUM(flagged_students) AS flagged FROM v_institution_summary
   WHERE state = 'Maharashtra'
```

### 4.5 SQL guard (mandatory)

```python
# app/services/llm/sql_guard.py
import re

ALLOWED_VIEWS = {"v_course_intake_status", "v_duplicate_enrolments",
                 "v_flag_summary", "v_institution_summary"}
FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|copy|pg_|information_schema)\b",
    re.I)

def validate_sql(sql: str) -> str:
    s = sql.strip().rstrip(";")
    if s.upper() == "UNSUPPORTED":
        raise ValueError("Question not supported")
    if ";" in s or not s.lower().startswith("select"):
        raise ValueError("Only a single SELECT is allowed")
    if FORBIDDEN.search(s):
        raise ValueError("Forbidden keyword")
    used = set(re.findall(r"\b(?:from|join)\s+([a-z_][a-z0-9_]*)", s, re.I))
    if not used or not used.issubset(ALLOWED_VIEWS):
        raise ValueError("Only approved views are allowed")
    if " limit " not in s.lower():
        s += " LIMIT 100"
    return s
```

Execution rules:
- Use the `llm_reader` database role (SELECT on the four views only).
- Set a statement timeout (for example, 5 seconds).
- On error, return a friendly message. Optionally retry once, passing the error to the model.
- Log every question and SQL to `audit_logs`.

Views must expose masked identifiers only (for example, masked APAAR ID).

### 4.6 Prompt: report summary

System prompt:

```
You write a short factual summary for AICTE officers from computed statistics (JSON).
Use only the numbers provided. Do not calculate new numbers, estimate, or add
outside knowledge. 4-6 sentences, neutral tone. Mention the biggest breaches first.
```

Compute everything in SQL or pandas first, then pass the numbers. After generation, an optional check confirms that every number in the text appears in the input JSON.

## 5. Guardrails summary

| Risk | Control |
|---|---|
| Wrong SQL from an 8B model | View whitelist, SELECT-only guard, read-only role, timeout, LIMIT |
| PII to a third-party LLM | Send only aggregates, masked examples and schemas |
| Hallucinated explanations | Constrain to the provided JSON, low temperature, short outputs |
| Prompt injection via data fields | Never put free-text student fields into prompts |
| Rate limits (Groq free tier) | Cache, batch explanations by rule code, call only on demand |
| Provider outage | Switch environment variables to Ollama |

## 6. Evaluation (to show in the pitch)

Use `ground_truth.csv` from the generator.

| Detector | Metric | Target |
|---|---|---|
| Rule engine | Recall on seeded errors | 100% |
| Cross-institution duplicates | Recall | 100% |
| Fuzzy matching | Precision and recall | Above 90% each |
| Anomaly detection | Seeded anomalous institutions found in top-k | All found |
| Text-to-SQL | Accuracy on 15-20 test questions | Above 80%, with 0 unsafe queries executed |

Keep a small `tests/test_llm_sql.py` with sample questions and expected SQL fragments, and tests that destructive or off-schema SQL is rejected by the guard.

## 7. Pitch line

"We enforce rules deterministically, use ML to detect anomalies and duplicates, and use an LLM only to explain and query. The model never decides on a record, and it runs on-premise if needed."
