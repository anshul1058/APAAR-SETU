# APAAR-SETU

**AICTE enforcement portal for the national APAAR student ID.** Colleges upload
enrolment CSVs; the system validates every row against the APAAR registry and a
rule engine, detects duplicates and anomalies across institutions, and lets
verifiers confirm a student's ID offline-verifiably via signed QR codes. An LLM
explains errors and answers questions in English — it never decides on a record.

Built for the hackathon on a fully synthetic, deterministically generated
dataset: 10 real Pune colleges plus one upload-fixture college, 11,658 students,
54 seeded errors with exact ground truth.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, SQLAlchemy 2, Alembic-free `init_db`, PostgreSQL (Supabase or local) |
| AI/ML | scikit-learn IsolationForest + z-scores, rapidfuzz, Groq LLM (llama-3.1-8b-instant) behind a SQL guard |
| Frontend | React 18, Vite 5, TypeScript, Tailwind, axios, react-router 7 |
| Crypto | Ed25519 signed verification payloads + QR export |
| Deploy | Docker on Render (`render.yaml`), static frontend anywhere |

## Repository layout

```
backend/            FastAPI app, validation/analytics/LLM services, seed + generators
  app/routers/      auth, uploads, students, dashboard, verify, reports, assistant
  data/             synthetic CSVs (clean/ + dirty/), APAAR registry, ground truth
  scripts/          generate_enrollments.py, generate_synthetic.py, seed.py, init_db.py, evaluate.py
  tests/            67 tests: rules, e2e against Postgres, SQL guard, text-to-SQL eval
frontend/           React SPA: login, institution + AICTE dashboards, verifier desk
DOCS_md/            prd, system, architecture, backend_guide, frontend_guide, aiml_guide
render.yaml         backend web service (Docker, rootDir: backend)
start.sh            start/stop/restart the backend (log: backend/server.log)
```

## Quickstart

### 1. Backend

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # Windows: .venv\Scripts\pip
cp .env.example .env        # set DATABASE_URL, JWT_SECRET, LLM_* (optional), SIGNING_*
```

`DATABASE_URL` accepts any Postgres. For Supabase on Render, copy the **shared
Transaction pooler** URI from the Supabase Connect dialog. It uses an IPv4
host like `aws-<index>-<region>.pooler.supabase.com:6543` and a username like
`postgres.<project-ref>`. Do not use `db.<project-ref>.supabase.co`, which is
IPv6-only on plans without the IPv4 add-on.

### 2. Database and demo data

```bash
.venv/bin/python scripts/init_db.py     # tables + 4 analytics views + llm_reader role
.venv/bin/python scripts/seed.py        # ~4 min: 11 institutions, 11,658 students, 15,000 registry
```

`seed.py` is deterministic (seed 42) and idempotent: re-running it only adds
missing institution-admin accounts. `--reset` wipes and reseeds, `--history`
refreshes enrolment history + anomaly scores.

### 3. Run it

```bash
./start.sh                                  # backend on http://localhost:8000 (API docs at /docs)
cd frontend && npm install && npm run dev   # SPA on http://localhost:5173
```

### 4. Or run everything with Docker

```bash
# Start PostgreSQL, FastAPI backend, and React frontend with 1 command:
docker compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API & Docs: `http://localhost:8000/docs` (health probe: `/health`)

Or build a single self-contained fullstack image from root:
```bash
docker build -t apaar-setu .
docker run -p 8000:8000 -e DATABASE_URL="<your_postgres_url>" apaar-setu
```


### Demo accounts (password for all: `password123`)

| Role | Email |
|---|---|
| AICTE admin (national) | `aicte.admin@gov.in` |
| AICTE officer | `aicte.officer@gov.in` |
| Institution admin | `admin@<slug>.in`, slug = lowercase CSV filename stem (e.g. `admin@mmcoe.in`, fixture `admin@abc.in`) |
| Verifier | `verifier@verify.in` |

## How validation works

Every upload is parsed, normalised, then run through deterministic checks
(`backend/app/services/validation/`):

- **14 rule codes** — APAAR format/missing/not-found (registry lookup), DOB and
  admission-date plausibility, category/quota/nationality consistency, passport
  format for NRI/OCI/FN students (foreign quota carries a passport, not an
  APAAR ID), field completeness.
- **Duplicates** — in-upload and cross-institution APAAR collisions, plus
  fuzzy name matching (rapidfuzz ≥ 90, same DOB, different ID) against the
  existing student body.
- **Aggregates** — approved-intake and supernumerary breaches per course.

Students are `valid` or `flagged`; nothing is silently dropped, and every flag
carries a machine-readable rule code for the UI and reports.

## AI / ML

- **Anomaly detection** (`dashboard/anomalies`): IsolationForest + z-scores over
  9 per-course features — fill ratio, year-over-year growth (2 years of seeded
  `enrolment_history`), NRI/OCI/FN shares, supernumerary share, late-admission
  share, flag rate, duplicate rate — with per-feature explanations. One college
  carries a planted +200% admission spike for the demo.
- **Assistant** (`/assistant/*`): explains validation errors, converts English
  questions to SQL over 4 masked read-only views (guarded, `llm_reader` role,
  statement timeout, audit log), and narrates computed statistics. Out-of-scope
  questions return `UNSUPPORTED`, never a query.

## Evaluation

`python scripts/evaluate.py` replays every detector over the dirty files and
scores against `ground_truth.csv`:

| Detector | Metric | Measured |
|---|---|---|
| Rule engine | recall on 54 seeded errors | **100%** (all 14 codes) |
| Fuzzy duplicates | precision / recall | **100% / 100%** |
| Extra detections | false positives | **0** |
| Anomaly detection | planted institutions in top-k | all in top-8 of 82 courses |
| Text-to-SQL | 12-question eval (`tests/test_llm_sql.py`) | guard-valid fragments; live checks skip offline |

## Tests

```bash
cd backend && .venv/bin/python -m pytest -q
```

67 tests: rule engine, auth, signing/QR, SQL guard, text-to-SQL eval, and a
full end-to-end suite against Postgres (login → upload → flags → dashboards →
RBAC → consent/OTP verification → signed QR → XLSX reports → audit log).
The e2e suite skips without a reachable Postgres and the live-LLM checks skip
offline, so `pytest` passes on any machine.

## Deployment

* **Backend → Render.** [`render.yaml`](render.yaml) is the blueprint: a free
  Docker web service (`rootDir: backend`) plus a free managed Postgres
  (`apaar-postgres`) wired into `DATABASE_URL` automatically. On every boot
  the container runs `scripts/init_db.py` (idempotent tables + views) and
  `scripts/seed.py` (demo dataset; skipped when already seeded), then serves
  uvicorn on `$PORT` — health check `GET /health`. `app/config.py` rewrites
  Render's `postgres://` scheme and enables SSL automatically. Remaining
  dashboard secrets: `LLM_KEY`, `SIGNING_PRIVATE_KEY`, and `CORS_ORIGINS`
  (which must list the Vercel URL of the frontend).
* **Frontend → Vercel.** `npm run build` in `frontend/`; serve the static
  `dist/` folder, and add its domain to `CORS_ORIGINS` on Render.

## Docs

Deep dives live in [`DOCS_md/`](DOCS_md/): [prd.md](DOCS_md/prd.md),
[system.md](DOCS_md/system.md) (data model + endpoints),
[architecture.md](DOCS_md/architecture.md),
[backend_guide.md](DOCS_md/backend_guide.md),
[frontend_guide.md](DOCS_md/frontend_guide.md),
[aiml_guide.md](DOCS_md/aiml_guide.md) (anomaly + LLM layer).

## License

See [LICENSE](LICENSE).
