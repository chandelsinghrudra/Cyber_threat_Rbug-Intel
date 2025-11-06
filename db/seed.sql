
-- db/seed.sql
USE cyber_portal_db;

-- Seed blacklist
INSERT IGNORE INTO phone_blacklist (phone, tag) VALUES
  ('+91-9999999999','Known scammer'),
  ('+91-8888888888','Repeat spammer');

-- Sample reports
INSERT INTO reports (reporter_name, phone, location, type_id, description, status_id)
VALUES
  ('Asha','+91-9999999999','Jaipur, Rajasthan',2,'Phishing email about bank KYC', 1),
  ('Ravi','+91-7777777777','Jaipur, Rajasthan',1,'UPI fraud attempt from unknown caller', 1),
  ('Neha','+91-9999999999','Kota, Rajasthan',2,'Repeated OTP calls', 2),
  ('Imran','+91-8888888888','Jaipur, Rajasthan',1,'Same number calling multiple times', 1);
