# Architecture

## 1. High-level view

```
                    +----------------------+
                    |   React Frontend     |
                    | Institution | AICTE  |
                    | Verifier portals     |
                    +----------+-----------+
                               | HTTPS (JWT)
                    +----------v-----------+
                    |   FastAPI Backend    |
                    |  Auth/RBAC | Audit   |
                    +--+-------+--------+--+
                       |       |        |
        +--------------+       |        +-----------------+
        |                      |                          |
+-------v--------+   +---------v---------+     +----------v----------+
| Validation     |   | Analytics Engine  |     | Verification Service|
| Engine         |   | Isolation Forest  |     | Consent/OTP, Ed25519|
| rules + fuzzy  |   | Z-score, stats    |     | signature, QR       |
+-------+--------+   +---------+---------+     +----------+----------+
        |                      |                          |
        +----------+-----------+--------------------------+
                   |
          +--------v---------+          +-----------------------+
          |  PostgreSQL      |          |  LLM Gateway          |
          |  repository +    |          |  Groq llama-3.1-8b    |
          |  read-only views |<---------+  (Ollama fallback)    |
          +--------+---------+  SELECT  +-----------------------+
                   |            only
          +--------v---------+
          | Mock APAAR       |
          | Service (pluggable)
          +------------------+
```

## 2. Layers

| Layer | Responsibility | Tech |
|---|---|---|
| Presentation | Three portals, dashboards, upload UI, assistant chat | React (Vite), Tailwind, Recharts |
| API | Auth, RBAC, upload, queries, verification, reports | FastAPI, Pydantic |
| Domain services | Validation, anomaly, fuzzy matching, verification, reporting | Python modules |
| Data | Repository, views, audit | PostgreSQL (Neon/Supabase) |
| AI | Explanations, text-to-SQL, summaries | llama-3.1-8b-instant via OpenAI-compatible API |
| Integration | APAAR lookup, ERP APIs | Adapter interface, mock now, real later |

## 3. Main flows

### 3.1 Upload and validate

```
Institution Admin
   | 1. POST /uploads (CSV)
   v
FastAPI -- 2. parse rows --> Validation Engine
   |                          | row rules -> db rules -> aggregate rules
   |                          | fuzzy matching
   |                          v
   |                     validation_flags
   | 3. valid rows upsert --> students
   | 4. anomaly scoring --> anomaly_scores
   | 5. audit log
   v
Response: summary + per-row errors (+ LLM explanations on request)
```

### 3.2 AICTE monitoring

```
AICTE Officer -> GET /dashboard/* -> SQL views -> charts
              -> POST /assistant/query
                    -> LLM (schema of views only) -> SQL
                    -> SQL guard (single SELECT, allowed views)
                    -> read-only DB role -> rows
                    -> LLM summary of the computed rows
```

### 3.3 Verification

```
Verifier -> POST /verify/request (APAAR ID)
         -> consent + OTP sent to student (mock)
Student  -> shares OTP with the verifier
Verifier -> POST /verify/confirm (consent_id + OTP)
         -> signed record + QR
Anyone   -> POST /verify/check (payload, signature) -> valid/invalid
```

## 4. Key design decisions

| Decision | Reason |
|---|---|
| Rules enforce, AI explains | Government data needs exact, auditable decisions |
| LLM sees only aggregates, schema and error codes | Protects PII and limits hallucination impact |
| Text-to-SQL via read-only views and a SQL guard | Prevents destructive or leaking queries |
| Adapter for APAAR service | Real API can replace the mock without code changes elsewhere |
| OpenAI-compatible LLM client with env-based URL | Switch between Groq and Ollama without code changes |
| Ed25519 signatures plus QR | Fast offline verification and tamper evidence |
| Institution scope from JWT | Prevents cross-institution data access |

## 5. Deployment topology

```
Vercel (React) --HTTPS--> Render (FastAPI) --> Neon/Supabase (PostgreSQL)
                                  |
                                  +--> Groq API (llama-3.1-8b-instant)

Fallback / offline demo:
Laptop: React + FastAPI + local PostgreSQL + Ollama (llama3.1:8b)
```

## 6. Integration points

| Interface | Direction | Notes |
|---|---|---|
| `POST /api/v1/uploads` | Institution ERP -> platform | CSV or JSON batch |
| `POST /api/v1/students` | Institution ERP -> platform | Single/bulk upsert |
| `GET /api/v1/reports/*` | AICTE systems -> platform | JSON/CSV exports |
| `APAARClient` adapter | Platform -> APAAR | `exists(apaar_id)` and `get_basic(apaar_id)` |
| `GET /api/v1/verify/public-key` | Third parties | Offline signature verification |

## 7. Repository structure

```
apaar-platform/
  backend/
    app/
      main.py
      config.py
      db.py
      models.py
      schemas.py
      auth/            # jwt, rbac
      routers/         # uploads, students, dashboard, verify, assistant, reports
      services/
        validation/    # rules.py, fuzzy.py, engine.py
        analytics/     # anomaly.py, stats.py
        verification/  # consent.py, signing.py, qr.py
        llm/           # client.py, prompts.py, sql_guard.py
        apaar_client.py
      audit.py
    scripts/
      generate_synthetic.py
      seed.py
    tests/
    requirements.txt
    Dockerfile
  frontend/
    src/
      pages/           # institution, aicte, verifier
      components/
      api/
  docs/                # prd.md, system.md, architecture.md, ...
  render.yaml
```

## 8. Scalability path (for the pitch)

- Move validation to a queue (Celery or RQ) for very large uploads.
- Partition `students` by academic year.
- Cache dashboard views with materialised views and refresh jobs.
- Replace the mock APAAR adapter with the official API and add retries and circuit breakers.
- Deploy the LLM on-premise (Ollama or vLLM) for government environments.
