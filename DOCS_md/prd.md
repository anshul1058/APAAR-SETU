# PRD: APAAR-Based Student Data Management & Verification Platform

**Problem Statement ID:** 26263
**Organisation:** AICTE (All India Council for Technical Education)
**Status:** Hackathon MVP + future scope

---

## 1. Problem

AICTE gets detailed student data only from PGDM institutions. Every other approved institution reports aggregate enrolment numbers during approval. As a result:

- Student records are not authentic or verifiable.
- Admissions above approved intake go undetected.
- The same student can be enrolled in multiple institutions, and ghost students can be counted.
- Supernumerary, NRI, OCI and Foreign National admissions are hard to track.
- There is no common identifier across institutional systems.
- Data arrives annually, so monitoring is never real time.
- Employers and regulators have no trusted way to verify enrolment.
- Certificates do not carry the APAAR ID.

## 2. Goal

Build an APAAR-linked platform where institutions submit student-level data, the system validates it automatically, AICTE monitors it in real time, and authorised parties verify records securely.

**Pipeline:** Institution upload -> APAAR validation -> data verification -> AICTE central repository -> analytics and monitoring -> authorised verification.

## 3. Non-goals (hackathon)

- Integration with the real APAAR/ABC system (we use a mock service with the same interface).
- Training deep learning models.
- Real student data. Only synthetic data is used.
- Production-grade scale and legal compliance sign-off.

## 4. Users

| User | Needs |
|---|---|
| **Institution admin** | Upload student data, see errors, fix and resubmit, track seats vs intake |
| **AICTE officer** | National view, breach and duplicate alerts, anomaly list, reports |
| **Verifier** (employer, regulator) | Confirm a student's enrolment and record authenticity, with student consent |
| **Student** (future) | Approve or revoke who can view their record |

## 5. Functional requirements

Numbers map to the problem statement's key requirements.

| ID | Requirement | PS ref | Priority |
|---|---|---|---|
| F1 | Secure upload (CSV/Excel), API push, and manual entry of student records keyed by APAAR ID | 1 | Must |
| F2 | Fields: approved intake, actual enrolment, supernumerary seats, NRI, OCI, FN status, other student info | 2 | Must |
| F3 | Automated validation: duplicates, invalid/missing APAAR ID, intake breach, data inconsistency, cross-institution duplicate enrolment | 3 | Must |
| F4 | Dashboards for AICTE and institutions with real-time refresh | 4 | Must |
| F5 | Verification portal with consent (OTP) and a signed result | 5 | Should |
| F6 | Verifiable student record (digital signature + QR) | 6 | Should |
| F7 | REST API for integration with institutional ERP and AICTE systems | 7 | Must |
| F8 | JWT auth, role-based access, audit trail, consent records | 8 | Must |
| F9 | Reports (PDF/Excel) for policy, accreditation and monitoring | 9 | Should |
| F10 | APAAR ID + student ID on certificates (certificate template/API field) | 10 | Could |
| F11 | Anomaly detection per institution (Isolation Forest + Z-score) | Innovation | Should |
| F12 | Fuzzy duplicate matching (name + DOB) | Innovation | Should |
| F13 | LLM assistant: error explanations, natural-language questions, report summaries | Innovation | Should |

## 6. Data fields

**Institution/course:** institution ID, name, state, course, branch, approved intake, supernumerary seats approved, academic year.

**Student:** APAAR ID, full name, date of birth, gender, course, branch, year of admission, admission date, category (General/OBC/SC/ST/EWS etc.), quota/seat type (regular, supernumerary, NRI, OCI, FN), nationality, student ID (institution roll number), contact email (hashed or masked in dashboards).

## 7. Validation rules (summary)

Full rule catalogue lives in `system.md`. Headline rules:

- APAAR ID present and in the valid format (12 digits, to be confirmed against the official spec).
- No duplicate APAAR ID within the same upload or institution.
- Same APAAR ID active in two institutions is flagged.
- Enrolled count per course must not exceed approved intake + approved supernumerary seats.
- Date and category consistency (DOB plausible, admission date in the academic year, quota matches nationality).
- Fuzzy name + DOB match flags possible duplicates with missing or different IDs.

## 8. Key user flows

1. **Upload:** admin uploads CSV, system validates, shows a per-row report, admin fixes and resubmits, clean rows go to the central repository.
2. **Monitor:** AICTE opens the dashboard, sees breaches, duplicates and anomalies, drills into an institution, and exports a report.
3. **Verify:** verifier enters an APAAR ID or scans a QR, the student consents via OTP, and the system returns a signed "Enrolled" record.
4. **Ask:** an AICTE officer types "Which colleges in Maharashtra exceeded intake?" and gets a table and a short summary.

## 9. Non-functional requirements

- **Security:** HTTPS, hashed passwords, JWT with short expiry, role-based access, parameterised queries.
- **Privacy:** consent for verification, PII masked in dashboards, audit log of every access.
- **Explainability:** every flag carries a rule code and a human-readable reason.
- **Performance:** validate 5,000 rows in under 10 seconds on a laptop.
- **Cost:** free tools only.
- **Availability for demo:** works fully offline with a local LLM as a fallback.

## 10. Success metrics

- All seeded error types in the demo dataset are detected (target: 100% for rule-based, at least 90% for fuzzy and anomaly flags).
- Upload-to-dashboard update in under 15 seconds.
- Verification result returned in under 3 seconds.
- Complete 3-minute live demo without manual database edits.

## 11. MVP scope vs future

**MVP (build for the hackathon)**
- Synthetic data generator, schema, rule engine, upload API and UI, institution tracker, AICTE dashboard.
- Fuzzy matching and anomaly detection.
- Signed record plus QR with mock OTP.
- LLM: error explanations, safe text-to-SQL, report summaries.

**Future**
- Real APAAR/ABC integration and DigiLocker linkage.
- Student consent app.
- Certificate integration with university systems.
- Multi-year trend forecasting.
- Agentic workflow that drafts notices to flagged institutions.

## 12. Assumptions and risks

| Item | Handling |
|---|---|
| No public APAAR API | Mock service with a pluggable interface, stated openly in the pitch |
| APAAR ID format may differ from our regex | Keep the regex in config, confirm against the spec |
| 8B LLM can produce wrong SQL | Read-only views, SELECT-only guard, low temperature, LLM never decides on records |
| Free tier rate limits (Groq, Render sleep) | Caching, warm-up before demo, local Ollama fallback |
| Privacy of real data | Synthetic data only; no real PII on free hosts |

## 13. Demo plan (3 minutes)

1. Upload a CSV seeded with a duplicate, a bad APAAR ID, an over-intake course and a cross-college student.
2. Show each error caught with its explanation.
3. Switch to the AICTE dashboard and show the live flags and the anomaly score.
4. Ask a natural-language question in the assistant.
5. Scan a QR to verify a student with OTP consent.
