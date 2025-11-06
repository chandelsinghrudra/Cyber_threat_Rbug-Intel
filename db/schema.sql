
-- db/schema.sql
-- Create database & normalized tables (DDL)

CREATE DATABASE IF NOT EXISTS cyber_portal_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE cyber_portal_db;

-- Reference table: threat types
CREATE TABLE IF NOT EXISTS threat_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description VARCHAR(255) NULL
) ENGINE=InnoDB;

-- Reference table: statuses
CREATE TABLE IF NOT EXISTS report_statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code ENUM('NOT_OPENED','UNDER_PROCESS','RESOLVED') NOT NULL UNIQUE,
  label VARCHAR(64) NOT NULL
) ENGINE=InnoDB;

-- Core table: reports
CREATE TABLE IF NOT EXISTS reports (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reporter_name VARCHAR(100) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  location VARCHAR(128) NOT NULL,
  type_id INT NOT NULL,
  description TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 0,          -- computed by trigger
  status_id INT NOT NULL,                   -- FK to report_statuses
  version INT NOT NULL DEFAULT 1,           -- optimistic concurrency
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_type FOREIGN KEY (type_id) REFERENCES threat_types(id),
  CONSTRAINT fk_reports_status FOREIGN KEY (status_id) REFERENCES report_statuses(id),
  INDEX idx_reports_phone (phone),
  INDEX idx_reports_loc_type (location, type_id),
  INDEX idx_reports_status (status_id),
  INDEX idx_reports_priority (priority DESC)
) ENGINE=InnoDB;

-- History table
CREATE TABLE IF NOT EXISTS report_status_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT NOT NULL,
  old_status_id INT NULL,
  new_status_id INT NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(255) NULL,
  CONSTRAINT fk_hist_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_status_new FOREIGN KEY (new_status_id) REFERENCES report_statuses(id),
  CONSTRAINT fk_hist_status_old FOREIGN KEY (old_status_id) REFERENCES report_statuses(id)
) ENGINE=InnoDB;

-- Incident logs (generic audit log)
CREATE TABLE IF NOT EXISTS incident_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT NULL,
  action ENUM('CREATED','STATUS_CHANGED','AUTO_MARKED','PRIORITY_COMPUTED') NOT NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_incident_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Optional: known suspicious numbers (to boost priority)
CREATE TABLE IF NOT EXISTS phone_blacklist (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(32) NOT NULL UNIQUE,
  tag VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
