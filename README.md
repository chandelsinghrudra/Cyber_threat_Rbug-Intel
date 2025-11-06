
# Cyber Threat Reporting Portal (Local, MySQL, Live Updates)

A full-stack RDBMS project you can run locally on macOS with **MySQL**, **Node.js (Express)**, and **React (Vite)**. 
It showcases: DDL, DML, **views**, **transactions**, **joins**, **normalization**, **concurrency control**, **triggers** (including **auto-marking**), and date/time usage —
plus **live updates** to the admin dashboard via WebSockets.

## Features
- Users submit reports: name, phone, location, type (fraud/scam/phishing/national-security/etc.), description.
- **Priority auto-calculated** on insert (trigger) using duplicates (same number) and hotspots (same location+type) and blacklist.
- **Auto-mark trigger**: if a number is blacklisted or repeats ≥ 3 times in the last 30 days, status auto-sets to `UNDER_PROCESS` (admin sees it on top).
- **Incident Logs**: `incident_logs` table records inserts/updates automatically via triggers (who/what/when as JSON details).
- Admin dashboard with **live updates** (Socket.IO) shows new reports and status changes in real time.
- Status workflow: `NOT_OPENED` → `UNDER_PROCESS` → `RESOLVED` (or back). Admin can update.
- **Transactions + concurrency**: status updates use a transaction with `SELECT ... FOR UPDATE` and an optimistic `version` column.
- **Views**: open reports, duplicate-number hotspots, and location+type hotspots.
- **Normalization**: threat types and statuses are reference tables; reports reference them.
- Works on macOS with **VS Code** + **MySQL** via Terminal.

## Stack
- **DB**: MySQL 8+ (InnoDB), SQL files in `db/`.
- **Backend**: Node.js 18+, Express, mysql2/promise, dotenv, zod, Socket.IO.
- **Frontend**: React + Vite, socket.io-client, fetch API.

---

## 0) Prereqs (macOS)
```bash
# Install MySQL (if not already)
brew install mysql
brew services start mysql

# Set MySQL root password if needed
mysql_secure_installation

# Install Node.js (18+ recommended)
brew install node
```

## 1) Create database & seed
```bash
cd backend
# copy env template
cp .env.example .env
# then edit .env with your MySQL creds (root / password or your user)

# Create schema & seed data
mysql -u root -p < ../db/schema.sql
mysql -u root -p < ../db/views.sql
mysql -u root -p < ../db/triggers.sql
mysql -u root -p < ../db/seed.sql
```
> If your MySQL user isn't `root`, adjust the command accordingly.

## 2) Run backend (port 4000)
```bash
cd backend
npm install
npm run dev
```

## 3) Run frontend (port 5173)
```bash
cd ../frontend
npm install
npm run dev
```
Open the shown URL (usually `http://localhost:5173`).

---

## Environment Variables (backend/.env)
- `DB_HOST` (default `127.0.0.1`)
- `DB_PORT` (default `3306`)
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME` (default `cyber_portal_db`)
- `PORT` (backend port, default `4000`)
- `CORS_ORIGIN` (frontend URL, default `http://localhost:5173`)

---

## API Overview

### Submit a report
`POST /api/reports`
```json
{
  "name": "Rudra",
  "phone": "+91-9876543210",
  "location": "Jaipur, Rajasthan",
  "type_id": 1,
  "description": "Phishing SMS asking for OTP."
}
```
- DML insert; trigger auto-sets `priority`; **auto-mark** may set status to `UNDER_PROCESS`.
- Emits `report:new` over WebSocket.

### List reports (admin)
`GET /api/reports?status=NOT_OPENED&search=9876`
- Demonstrates **joins** (reports ↔ types ↔ statuses) and filtering.

### Update status (transaction + locking + optimistic version)
`PATCH /api/reports/:id/status`
```json
{ "new_status": "UNDER_PROCESS", "version": 3 }
```
- Uses a **transaction**: `SELECT ... FOR UPDATE`, version check, update, insert status history & incident log, emit `report:updated`.

### Mark resolved
`PATCH /api/reports/:id/resolve`
- Same as above with `new_status = RESOLVED`.

---

## SQL Highlights (see `db/`)
- **DDL**: normalized tables (`threat_types`, `report_statuses`, `reports`, `report_status_history`, `incident_logs`, `phone_blacklist`).
- **Triggers**: 
  - `BEFORE INSERT` computes `priority` and may **auto-mark** to `UNDER_PROCESS`.
  - `AFTER INSERT/UPDATE` write to **incident_logs** and status history.
- **Views**: `v_open_reports`, `v_duplicate_numbers`, `v_hotspots_by_location_and_type`.
- **Dates**: `created_at`, `updated_at`, and history timestamps.
- **Joins**: used in admin list and views.
- **Transactions/Concurrency**: version column + `SELECT ... FOR UPDATE` on updates.

---

## Demo Data
Run `db/seed.sql` to load sample types and few reports for testing.

---

## VS Code tips
- Open `cyber-threat-portal` folder in VS Code.
- Use the REST endpoints via Thunder Client/Insomnia/Postman, or the frontend pages:
  - `/` User report form
  - `/admin` Admin dashboard (live updates)

---

## Common Mac Issues
- **ECONNREFUSED**: ensure MySQL is running (`brew services list`). Check `.env` credentials.
- **ER_NOT_SUPPORTED_AUTH_MODE**: run `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'yourpass'; FLUSH PRIVILEGES;`
- **Port in use**: change `PORT` or kill the process (`lsof -i :4000`).

