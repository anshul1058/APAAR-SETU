# APAAR-SETU Diagrams

These diagrams are derived from the current repository implementation and documentation.

## Judge-ready versions

Use these simplified views for a presentation: they emphasize the problem, the four user outcomes, and the safety boundary around AI.

### Judge-ready architecture

```mermaid
flowchart LR
    subgraph client ["People and Systems"]
        users["Institution, AICTE and verifier portals"]
        erp["College ERP upload"]
    end
    subgraph gateway ["Secure API"]
        api["FastAPI API: JWT and role-based access"]
    end
    subgraph service ["Platform Brain"]
        validate["Validate every student record"]
        monitor["Detect duplicates, breaches and anomalies"]
        verify["Consent, sign and create QR proof"]
        assistant["AI assistant: explain and answer safely"]
    end
    subgraph datastore ["Trusted Record"]
        db["PostgreSQL: students, flags, audit and masked views"]
    end
    subgraph external ["Connected Services"]
        registry["APAAR registry adapter"]
        llm["Groq or Ollama LLM"]
    end
    users -->|"Secure access"| api
    erp -->|"Student data"| api
    api -->|"Routes requests"| validate
    api -->|"Shows dashboards"| monitor
    api -->|"Verifies identity"| verify
    api -->|"Answers questions"| assistant
    validate -->|"Checks and stores"| db
    validate -.->|"Checks ID"| registry
    monitor -->|"Reads evidence"| db
    verify -->|"Stores signed proof"| db
    assistant -->|"Reads masked data"| db
    assistant -.->|"Explains only"| llm
```

### Judge-ready use cases

```mermaid
flowchart LR
    subgraph people ["Who benefits"]
        college(["College admin"])
        officer(["AICTE officer"])
        verifier(["Verifier"])
        student(["Student"])
    end
    subgraph actions ["What they do"]
        submit["Submit student enrolment data"]
        fix["Fix flagged records"]
        monitor["Monitor national compliance"]
        investigate["Investigate duplicates and anomalies"]
        ask["Ask AI for explanations"]
        request["Request verification"]
        consent["Student approves with OTP"]
        prove["Receive signed QR proof"]
    end
    subgraph outcomes ["What they get"]
        clean["Clean, trusted student records"]
        insight["Early warning on over-admission and duplicates"]
        proof["Offline-verifiable enrolment proof"]
    end
    college --> submit
    college --> fix
    officer --> monitor
    officer --> investigate
    officer --> ask
    verifier --> request
    student --> consent
    submit --> clean
    fix --> clean
    monitor --> insight
    investigate --> insight
    ask --> insight
    request --> consent
    consent --> prove
```

### Judge-ready AI pipeline

```mermaid
flowchart LR
    input(["Student data or officer question"])
    rules["1. Rules decide: APAAR, dates, quota, duplicates and intake"]
    result["Trusted result: valid record or explainable flag"]
    ml["2. ML detects patterns: Isolation Forest and fuzzy matching"]
    risk["Risk signals: anomaly score and duplicate alert"]
    llm["3. LLM explains: masked data and approved views only"]
    guard{"Safe query?"}
    answer["Clear answer: explanation, table or report summary"]
    human(["Human makes the final decision"])
    input --> rules
    rules --> result
    result --> ml
    ml --> risk
    risk --> llm
    input --> llm
    llm --> guard
    guard -->|"Yes"| answer
    guard -->|"No"| answer
    answer --> human
```

### Judge-ready user flow

```mermaid
flowchart LR
    login(["1. User logs in"])
    role{"Which role?"}
    college["College admin"]
    aiCte["AICTE officer"]
    verifier["Verifier"]
    upload["Upload student CSV or Excel"]
    validate["APAAR and rule validation"]
    flags{"Any flags?"}
    fix["Fix records and resubmit"]
    trusted["Trusted records stored"]
    dashboard["View compliance dashboard"]
    alerts["See duplicates, intake breaches and anomalies"]
    ask["Ask AI for explanation or summary"]
    request["Enter student APAAR ID"]
    otp["Student confirms with OTP"]
    signed["Signed record and QR proof"]
    outcome(["Trusted action or decision"])
    login --> role
    role -->|"College admin"| college
    role -->|"AICTE officer"| aiCte
    role -->|"Verifier"| verifier
    college --> upload
    upload --> validate
    validate --> flags
    flags -->|"Yes"| fix
    fix --> upload
    flags -->|"No"| trusted
    trusted --> outcome
    aiCte --> dashboard
    dashboard --> alerts
    alerts --> ask
    ask --> outcome
    verifier --> request
    request --> otp
    otp --> signed
    signed --> outcome
```

## 1. Architecture

```mermaid
flowchart LR
    subgraph client ["Clients"]
        webApp["React SPA: institution, AICTE, verifier portals"]
        erpClient["Institution ERP: CSV or JSON integration"]
        verifierClient["Third-party verifier"]
    end
    subgraph gateway ["API Gateway"]
        fastApi["FastAPI application: JWT and RBAC routes"]
    end
    subgraph service ["Core Services"]
        authService["Auth and audit"]
        uploadService["Upload and validation"]
        analyticsService["Dashboard and analytics"]
        verificationService["Consent, signing and QR"]
        assistantService["Assistant orchestration: explain, text-to-SQL, summary"]
    end
    subgraph datastore ["Data Stores"]
        postgres["PostgreSQL: repository, audit, masked views"]
    end
    subgraph external ["External Integrations"]
        apaarService["APAAR adapter: mock now, real later"]
        llmProvider["Groq or Ollama: OpenAI-compatible LLM"]
    end

    webApp -->|"HTTPS and JWT"| fastApi
    erpClient -->|"CSV or JSON upload"| fastApi
    verifierClient -->|"Verification API"| fastApi
    fastApi -->|"Auth routes"| authService
    fastApi -->|"Upload routes"| uploadService
    fastApi -->|"Dashboard and report routes"| analyticsService
    fastApi -->|"Verification routes"| verificationService
    fastApi -->|"Assistant routes"| assistantService
    authService -->|"Users and audit"| postgres
    uploadService -->|"Validate and persist"| postgres
    uploadService -->|"APAAR lookup"| apaarService
    analyticsService -->|"Read views and scores"| postgres
    verificationService -->|"Consent and signed records"| postgres
    assistantService -->|"Read masked views"| postgres
    assistantService -.->|"Explain or generate SQL"| llmProvider
```

## 2. Use cases

```mermaid
flowchart LR
    subgraph actors ["Actors"]
        institutionAdmin(["Institution admin"])
        aicteOfficer(["AICTE officer or admin"])
        verifier(["Verifier"])
        student(["Student consent holder"])
        erp(["Institution ERP"])
    end
    subgraph useCases ["APAAR-SETU use cases"]
        upload["Upload enrolment CSV or Excel"]
        fix["Review flags and resubmit fixes"]
        ownDashboard["View institution dashboard"]
        nationalDashboard["Monitor national dashboards"]
        duplicateReview["Review duplicate and anomaly alerts"]
        report["Export compliance reports"]
        askAssistant["Ask assistant for explanations or aggregate queries"]
        requestVerification["Request student verification"]
        grantConsent["Grant consent with OTP"]
        receiveSigned["Receive signed record and QR"]
        verifyOffline["Check signature and public key"]
        erpPush["Push records through integration API"]
    end

    institutionAdmin --> upload
    institutionAdmin --> fix
    institutionAdmin --> ownDashboard
    aicteOfficer --> nationalDashboard
    aicteOfficer --> duplicateReview
    aicteOfficer --> report
    aicteOfficer --> askAssistant
    verifier --> requestVerification
    verifier --> receiveSigned
    verifier --> verifyOffline
    student --> grantConsent
    erp --> erpPush
    erpPush --> upload
    upload --> fix
    requestVerification --> grantConsent
    grantConsent --> receiveSigned
    receiveSigned --> verifyOffline
```

## 3. AI pipeline

```mermaid
flowchart LR
    start(["Student upload or dashboard question"])
    parse["Parse and normalize rows"]
    rules["Deterministic validation: format, fields, dates, quota, APAAR"]
    registry["APAAR registry lookup"]
    duplicates["Duplicate detection: in-upload, database, fuzzy name plus DOB"]
    aggregates["Aggregate checks: intake and supernumerary limits"]
    persist["Persist accepted rows and flags"]
    features["Build course-year features: 9 analytics features"]
    anomaly["Isolation Forest or Z-score baseline"]
    reasons["Z-score top reasons"]
    dashboard["Dashboard anomaly scores and flags"]
    question["Natural-language assistant question"]
    prompt["LLM prompt with masked views or grouped flags"]
    sql["LLM output: SELECT or explanation"]
    guard{"SQL safe and supported?"}
    reader["Read-only llm_reader: 4 approved views, 5s timeout"]
    summary["LLM summary of computed rows"]
    response["Human-readable explanation, table or summary"]
    reject["Return unsupported or validation error"]

    start --> parse --> rules
    rules --> registry --> duplicates --> aggregates --> persist
    persist --> features --> anomaly --> reasons --> dashboard
    start --> question --> prompt --> sql --> guard
    guard -->|"Yes"| reader --> summary --> response
    guard -->|"No"| reject
    persist -.->|"Grouped rule counts on demand"| prompt
    dashboard -.->|"Computed stats on demand"| prompt
```

## Implementation note

The backend exposes live `/assistant/explain`, `/assistant/query`, and `/assistant/summary` endpoints. The current React `aiAssistantService.ts` is a local deterministic demo response layer and does not call those endpoints yet.
