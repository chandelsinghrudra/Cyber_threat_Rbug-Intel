Cyber Threat Reporting Portal

A full-stack cyber incident reporting system built for local use on macOS.
The project demonstrates key database concepts such as views, triggers, joins, normalization, transactions, and concurrency, along with a working frontend and backend.

Tech Stack
	•	Backend: Node.js (Express), MySQL
	•	Frontend: React 
	•	Database: MySQL 

Features

User Side
Users can submit a cyber incident report containing:
	•	Name
	•	Phone number
	•	Location
	•	Threat type (fraud, scam, phishing, security, etc.)
	•	Description

Admin Dashboard
	•	Displays all reports with live updates when new reports arrive
	•	Filter by status and search by name/phone/location
	•	Status workflow: NOT_OPENED → UNDER_PROCESS → RESOLVED
	•	View the full description in a modal
	•	Real-time updates using Socket.IO

Database Logic
	•	A trigger calculates a priority score for each new report
	•	Auto-marking of suspicious or repeated phone numbers
	•	Triggers add entries to the incident_logs table
	•	Views for open reports, duplicate phone numbers, and location-based hotspots
	•	Normalized database structure with reference tables
	•	Transactions and version control for safer updates

Setup Instructions (macOS)

1. Install prerequisites
brew install mysql
brew services start mysql
brew install node

2. Create database and load SQL files
mysql -u root -p < db/schema.sql
mysql -u root -p < db/views.sql
mysql -u root -p < db/triggers.sql
mysql -u root -p < db/seed.sql

3. Run the backend
cd backend
cp .env.example .env
npm install
npm run dev

URL:
http://localhost:4000

4.Run the frontend:
cd frontend
npm install
npm run dev

URL:
http://localhost:5173

Admin dashboard URL:
http://localhost:5173/admin

Useful SQL
USE cyber_portal_db;

SHOW TABLES;

SELECT * FROM reports ORDER BY created_at DESC;

SELECT * FROM v_open_reports;

SELECT * FROM v_hotspots_by_location_and_type;

Priority Calculation:

1. Each report is given a base priority value.
2. Priority is raised for reports from the same phone number within the previous 30 days.
3. The priority rises even more if numerous reports from the same location and threat type have been received in the previous seven days. 4. The priority rises significantly if the phone number is on the blacklist.
5. The report is automatically marked as "UNDER_PROCESS" if a number is blacklisted or repeated excessively.
priority = 10
         + (5 × duplicate phone count in last 30 days)
         + (3 × hotspot count for same location + type in last 7 days)
         + 20 if phone is in blacklist


