
-- db/views.sql
USE cyber_portal_db;

-- View: open reports with joined labels (joins + filtering + order)
CREATE OR REPLACE VIEW v_open_reports AS
SELECT r.id, r.reporter_name, r.phone, r.location, tt.name AS threat_type,
       rs.code AS status_code, r.priority, r.created_at
FROM reports r
JOIN threat_types tt ON tt.id = r.type_id
JOIN report_statuses rs ON rs.id = r.status_id
WHERE rs.code IN ('NOT_OPENED','UNDER_PROCESS')
ORDER BY r.priority DESC, r.created_at DESC;

-- View: duplicate-number hotspots (same phone, recent 14 days)
CREATE OR REPLACE VIEW v_duplicate_numbers AS
SELECT phone, COUNT(*) AS report_count, MIN(created_at) AS first_seen, MAX(created_at) AS last_seen
FROM reports
WHERE created_at >= (CURRENT_TIMESTAMP - INTERVAL 14 DAY)
GROUP BY phone
HAVING COUNT(*) >= 2
ORDER BY report_count DESC, last_seen DESC;

-- View: hotspots by (location, threat type) in recent 14 days
CREATE OR REPLACE VIEW v_hotspots_by_location_and_type AS
SELECT r.location, tt.name AS threat_type, COUNT(*) AS report_count,
       MIN(r.created_at) AS first_seen, MAX(r.created_at) AS last_seen
FROM reports r
JOIN threat_types tt ON tt.id = r.type_id
WHERE r.created_at >= (CURRENT_TIMESTAMP - INTERVAL 14 DAY)
GROUP BY r.location, tt.name
HAVING COUNT(*) >= 2
ORDER BY report_count DESC, last_seen DESC;
