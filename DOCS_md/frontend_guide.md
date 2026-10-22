# Frontend Guide (React + Vite)

API endpoints and roles come from `backend_guide.md` and `system.md`. Use the color combination and theme already shared with you — this doc covers **what to build, the user flows, and the features per screen**.

---

## 1. Setup

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom axios recharts tailwindcss @tailwindcss/vite
```

- Dev server: Vite on `http://localhost:5173` (already allowed in backend `CORS_ORIGINS`). Alternative: proxy `/api` to `http://localhost:8000` in `vite.config.js`.
- Folder layout (from `architecture.md`):

```
src/
  pages/        # institution, aicte, verifier
  components/   # shared UI
  api/          # axios client + endpoint wrappers
```

## 2. Auth and routing (build this first)

- `POST /api/v1/auth/login` with email + password. Store the JWT in memory or localStorage.
- Decode the JWT: `{ sub, role, institution_id, exp }`. Route the user by `role` after login:

| Role | Lands on |
|---|---|
| `institution_admin` | `/institution` |
| `aicte_officer`, `aicte_admin` | `/aicte` |
| `verifier` | `/verify` |

- Wrap every authenticated route in a guard component that redirects to `/login` on 401 or missing role.
- Attach the token to every axios request via an interceptor: `Authorization: Bearer <token>`.
- On any 403/401 response, show a friendly error and bounce to login — never render data the role is not allowed to see (hidden routes are not enough; the backend also rejects).

## 3. User flows (the four things to demo)

### Flow A — Institution upload (the core loop)
1. Admin logs in → sees **Upload** page with a drag-and-drop area and a "Download template CSV" button.
2. Drops a CSV/XLSX → `POST /uploads` → progress indicator (500 rows ≈ up to 10s).
3. Result card appears: total / valid / errors / warnings, plus a by-rule breakdown (e.g. `APAAR_FORMAT: 9`).
4. Admin clicks a rule chip → `GET /uploads/{id}/flags` → per-row error table (row number, student, rule code, human reason, severity badge).
5. Admin downloads errors, fixes the CSV, resubmits. Clean rows now appear in their tracker.

### Flow B — AICTE monitor
1. Officer logs in → **Dashboard overview**: KPI cards (institutions, students, flagged, duplicate enrolments) from `GET /dashboard/overview`.
2. Intake chart (bar: approved intake vs enrolled per course) from `GET /dashboard/intake`, with a red excess segment for breaches.
3. Duplicates list from `GET /dashboard/duplicates` (masked APAAR IDs — never show full IDs in dashboards).
4. Anomaly table with score and reasons from `GET /dashboard/anomalies`, colour the score (green < 0.65, red ≥ threshold).
5. Export buttons (PDF/Excel) hitting `GET /reports/{type}`.

### Flow C — Verification
1. Verifier (no deep login needed) enters a 12-digit APAAR ID or scans a QR → `POST /verify/request` → OTP sent; in mock mode show the OTP on screen.
2. Verifier enters OTP → `POST /verify/confirm` → signed record card: institution, course, academic year, status `ENROLLED`, issued_at, signature validity badge, and a QR to re-verify.
3. "Check a record" page for the public path: paste/upload a payload → `POST /verify/check` → Valid / Tampered.

### Flow D — LLM assistant
1. On any flag row, an "Explain" button → `POST /assistant/explain` → shows a plain-English explanation of the rule (loading state; LLM can take a few seconds).
2. On the AICTE dashboard, a chat box → `POST /assistant/query` → answer rendered as a table plus a 2–3 line summary.
3. In reports, a "Generate summary" button → `POST /assistant/summary`.

## 4. Pages and features

### Institution portal (`/institution/*`) — role: `institution_admin`
- **Dashboard**: own students count, flagged count, last upload status, intake-vs-enrolled for own courses only (`/dashboard/intake` — backend scopes it to the institution).
- **Upload**: drag-and-drop, template download, result summary, rule-chip filter, flags table with severity badges (error red / warning amber), resubmit loop.
- **Students**: searchable list (`GET /students`), masked contact, bulk-add form (`POST /students`).
- **AI help**: explain buttons on flags.

### AICTE portal (`/aicte/*`) — roles: `aicte_officer`, `aicte_admin`
- **Overview dashboard**: KPI cards, state-wise table, Recharts bar/pie charts, auto-refresh every 15s (poll — no websockets needed for MVP).
- **Intake breaches**: sortable table, drill into institution.
- **Duplicates**: cross-institution list, masked IDs.
- **Anomalies**: score distribution, reasons per institution.
- **Categories**: NRI/OCI/FN/supernumerary breakdown (`/dashboard/categories`).
- **Reports**: type picker + export buttons.
- **Assistant**: chat panel (NL question → table + summary).
- **Admin only**: user and institution management screens.

### Verification portal (`/verify/*`) — role: `verifier`, plus one public page
- **Start**: APAAR ID input (12 digits, client-side validated) + QR scan option.
- **OTP step**: 6-digit OTP input, resend countdown, 5-attempt limit message.
- **Result**: signed record card + QR image.
- **Public check**: `/verify/check` page — paste payload, show valid/tampered.

## 5. Shared components to build once

| Component | Used by |
|---|---|
| `StatCard` (value + label + trend) | all dashboards |
| `DataTable` (sort, filter, pagination) | flags, students, duplicates, anomalies |
| `SeverityBadge` (error/warning/ok) | upload flags, dashboard |
| `RuleChip` (code + count, click to filter) | upload result |
| `FileDropzone` (CSV/XLSX, 10 MB limit, rejects wrong type client-side) | upload |
| `ChartCard` (Recharts wrapper) | dashboards |
| `OtpInput` | verification |
| `ChatPanel` (message list + input + loading) | assistant |
| `EmptyState` and `ErrorState` | everywhere |

## 6. UX rules from the PRD that the UI must respect

- **Masking**: PII is masked in dashboards — render masked values as-is, never reconstruct.
- **Explainability**: every flag shows its rule code **and** the human-readable reason. No naked error codes.
- **Refresh**: dashboards poll every 15s; upload result updates in place (target: upload → dashboard < 15s).
- **Speed**: verification result in under 3s — show the OTP step and result as fast states, no heavy spinners.
- **Offline demo**: if the LLM call fails, show a static explanation fallback; the app must demo without AI.
- **Dates/numbers**: ISO dates from API, display as DD MMM YYYY; keep thousands separators on counts.

## 7. Build order (matches backend readiness)

1. Vite + Tailwind + theme, router, axios client, login + role guard.
2. Institution: upload flow + flags table + tracker (this is the demo's main act).
3. AICTE: overview dashboard + intake/duplicates/anomalies tables + charts.
4. Verification: request → OTP → signed record card.
5. Assistant: explain button, chat panel, report summary.
6. Reports export, polish, empty/loading/error states, mobile pass.

Deploy: Vercel, `VITE_API_URL` env var pointing at the Render backend URL.
