
-- db/triggers.sql
USE cyber_portal_db;

-- Insert reference data if missing
INSERT IGNORE INTO report_statuses (id, code, label) VALUES
  (1,'NOT_OPENED','Not Opened'),
  (2,'UNDER_PROCESS','Under Process'),
  (3,'RESOLVED','Resolved');

INSERT IGNORE INTO threat_types (id, name, description) VALUES
  (1,'Fraud','Financial fraud, UPI scams, etc.'),
  (2,'Phishing','Email/SMS/Call phishing attempts'),
  (3,'Cyber Bullying','Harassment over digital platforms'),
  (4,'National Security','Suspicious activities with national implications'),
  (5,'Malware','Malware distribution or infection');

-- Priority + Auto-mark BEFORE INSERT
DROP TRIGGER IF EXISTS trg_reports_before_insert;
DELIMITER $$
CREATE TRIGGER trg_reports_before_insert
BEFORE INSERT ON reports
FOR EACH ROW
BEGIN
  DECLARE dup_phone INT DEFAULT 0;
  DECLARE hotspot INT DEFAULT 0;
  DECLARE bl_bonus INT DEFAULT 0;
  DECLARE default_status_id INT;
  DECLARE under_process_id INT;
  DECLARE should_automark BOOLEAN DEFAULT FALSE;

  SELECT id INTO default_status_id FROM report_statuses WHERE code='NOT_OPENED' LIMIT 1;
  SELECT id INTO under_process_id FROM report_statuses WHERE code='UNDER_PROCESS' LIMIT 1;

  IF NEW.status_id IS NULL THEN
    SET NEW.status_id = default_status_id;
  END IF;

  SELECT COUNT(*) INTO dup_phone
    FROM reports
    WHERE phone = NEW.phone
      AND created_at >= (CURRENT_TIMESTAMP - INTERVAL 30 DAY);

  SELECT COUNT(*) INTO hotspot
    FROM reports
    WHERE location = NEW.location AND type_id = NEW.type_id
      AND created_at >= (CURRENT_TIMESTAMP - INTERVAL 7 DAY);

  SELECT IF(COUNT(*)>0,20,0) INTO bl_bonus FROM phone_blacklist WHERE phone = NEW.phone;

  SET NEW.priority = 10 + (5 * dup_phone) + (3 * hotspot) + bl_bonus;

  -- Auto-mark rule: blacklisted OR duplicate >= 3 => UNDER_PROCESS
  IF bl_bonus >= 20 OR dup_phone >= 3 THEN
    SET NEW.status_id = under_process_id;
    SET should_automark = TRUE;
  END IF;

  -- Bump version initial
  SET NEW.version = 1;
END$$
DELIMITER ;

-- Log on INSERT and on status change
DROP TRIGGER IF EXISTS trg_reports_after_insert;
DELIMITER $$
CREATE TRIGGER trg_reports_after_insert
AFTER INSERT ON reports
FOR EACH ROW
BEGIN
  INSERT INTO incident_logs (report_id, action, details)
  VALUES (NEW.id, 'PRIORITY_COMPUTED',
          JSON_OBJECT('priority', NEW.priority, 'phone', NEW.phone, 'location', NEW.location, 'type_id', NEW.type_id));
  -- If status is UNDER_PROCESS at creation, record AUTO_MARKED
  IF (SELECT code FROM report_statuses WHERE id = NEW.status_id) = 'UNDER_PROCESS' THEN
    INSERT INTO incident_logs (report_id, action, details)
    VALUES (NEW.id, 'AUTO_MARKED',
            JSON_OBJECT('reason','blacklist_or_duplicate','priority', NEW.priority));
  END IF;

  -- History line for created status
  INSERT INTO report_status_history (report_id, old_status_id, new_status_id, note)
  VALUES (NEW.id, NULL, NEW.status_id, 'Created');
END$$
DELIMITER ;

-- Log on UPDATE (status changes + incident log)
DROP TRIGGER IF EXISTS trg_reports_after_update;
DELIMITER $$
CREATE TRIGGER trg_reports_after_update
AFTER UPDATE ON reports
FOR EACH ROW
BEGIN
  IF NEW.status_id <> OLD.status_id THEN
    INSERT INTO report_status_history (report_id, old_status_id, new_status_id, note)
    VALUES (NEW.id, OLD.status_id, NEW.status_id, 'Status changed via API');

    INSERT INTO incident_logs (report_id, action, details)
    VALUES (NEW.id, 'STATUS_CHANGED',
            JSON_OBJECT('from', (SELECT code FROM report_statuses WHERE id=OLD.status_id),
                        'to', (SELECT code FROM report_statuses WHERE id=NEW.status_id)));
  END IF;
END$$
DELIMITER ;
