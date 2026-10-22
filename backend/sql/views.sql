-- APAAR-SETU: indexes and read-only views (backend_guide.md §3)
-- Tables are created by SQLAlchemy (scripts/init_db.py); this file adds
-- the indexes that are already covered by models plus the dashboard views.

-- Views used by dashboards and the LLM ---------------------------------

CREATE OR REPLACE VIEW v_course_intake_status AS
SELECT i.id AS institution_id, i.name AS institution, i.state,
       c.id AS course_id, c.name AS course, c.academic_year,
       c.approved_intake, c.approved_supernumerary,
       COUNT(s.id) AS enrolled,
       COUNT(*) FILTER (WHERE s.quota_type = 'supernumerary') AS supernumerary_enrolled,
       COUNT(s.id) - (c.approved_intake + c.approved_supernumerary) AS excess
FROM courses c
JOIN institutions i ON i.id = c.institution_id
LEFT JOIN students s ON s.course_id = c.id AND s.status IN ('valid','flagged')
GROUP BY i.id, i.name, i.state, c.id, c.name, c.academic_year,
         c.approved_intake, c.approved_supernumerary;

CREATE OR REPLACE VIEW v_duplicate_enrolments AS
SELECT 'XXXXXXXX' || RIGHT(apaar_id, 4) AS apaar_id_masked,
       COUNT(DISTINCT institution_id) AS institutions
FROM students WHERE status IN ('valid','flagged')
GROUP BY apaar_id HAVING COUNT(DISTINCT institution_id) > 1;

CREATE OR REPLACE VIEW v_flag_summary AS
SELECT i.name AS institution, i.state, f.rule_code, f.severity,
       COUNT(*) AS flag_count
FROM validation_flags f
JOIN uploads u ON u.id = f.upload_id
JOIN institutions i ON i.id = u.institution_id
WHERE f.resolved = false
GROUP BY i.name, i.state, f.rule_code, f.severity;

CREATE OR REPLACE VIEW v_institution_summary AS
SELECT i.id AS institution_id, i.name AS institution, i.state,
       COUNT(s.id) AS total_students,
       COUNT(*) FILTER (WHERE s.status = 'flagged') AS flagged_students,
       COALESCE(MAX(a.score), 0) AS anomaly_score
FROM institutions i
LEFT JOIN students s ON s.institution_id = i.id
LEFT JOIN anomaly_scores a ON a.institution_id = i.id
GROUP BY i.id, i.name, i.state;
