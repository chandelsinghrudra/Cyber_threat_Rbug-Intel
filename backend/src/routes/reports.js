import express from "express";
import { pool } from "../db.js";  // ✅ FIXED — matches your index.js

const router = express.Router();

// ------------------------------
// LIST REPORTS (with description)
// ------------------------------
router.get("/", async (req, res) => {
  try {
    const { status = "", search = "" } = req.query;

    let where = `WHERE 1=1`;
    let params = [];

    if (status) {
      where += ` AND rs.code = ?`;
      params.push(status);
    }

    if (search) {
      where += ` AND (r.reporter_name LIKE ? OR r.phone LIKE ? OR r.location LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      `
      SELECT 
        r.id,
        r.reporter_name,
        r.phone,
        r.location,
        r.description,      -- ✅ description included
        r.priority,
        r.type_id,
        r.created_at,
        r.version,
        tt.name AS threat_type,
        rs.code AS status_code
      FROM reports r
      JOIN threat_types tt ON r.type_id = tt.id
      JOIN report_statuses rs ON r.status_id = rs.id
      ${where}
      ORDER BY r.created_at DESC
      `,
      params
    );

    res.json({ ok: true, reports: rows });
  } catch (err) {
    console.error("LIST ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ------------------------------
// CREATE REPORT
// ------------------------------
router.post("/", async (req, res) => {
  try {
    const { name, phone, location, type_id, description } = req.body;

    const [result] = await pool.query(
      `INSERT INTO reports (reporter_name, phone, location, type_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [name, phone, location, type_id, description]
    );

    const [rows] = await pool.query(
      `
      SELECT 
        r.*,
        tt.name AS threat_type,
        rs.code AS status_code
      FROM reports r
      JOIN threat_types tt ON r.type_id = tt.id
      JOIN report_statuses rs ON r.status_id = rs.id
      WHERE r.id = ?
      `,
      [result.insertId]
    );

    res.json({ ok: true, report: rows[0] });
  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ------------------------------
// UPDATE STATUS
// ------------------------------
router.post("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { new_status, version } = req.body;

    const [[row]] = await pool.query(
      "SELECT version FROM reports WHERE id = ?",
      [id]
    );

    if (!row) return res.json({ ok: false, error: "Not found" });

    if (row.version !== version)
      return res.json({ ok: false, error: "Version mismatch (concurrency conflict)" });

    await pool.query(
      `
      UPDATE reports
      SET status_id = (SELECT id FROM report_statuses WHERE code = ?),
          version = version + 1
      WHERE id = ?
      `,
      [new_status, id]
    );

    const [[updated]] = await pool.query(
      `
      SELECT 
        r.*, 
        tt.name AS threat_type,
        rs.code AS status_code
      FROM reports r
      JOIN threat_types tt ON r.type_id = tt.id
      JOIN report_statuses rs ON r.status_id = rs.id
      WHERE r.id = ?
      `,
      [id]
    );

    res.json({ ok: true, report: updated });
  } catch (err) {
    console.error("STATUS ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ------------------------------
// RESOLVE REPORT
// ------------------------------
router.post("/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.body;

    const [[row]] = await pool.query(
      "SELECT version FROM reports WHERE id = ?",
      [id]
    );

    if (!row) return res.json({ ok: false, error: "Not found" });
    if (row.version !== version)
      return res.json({ ok: false, error: "Version mismatch (concurrency conflict)" });

    await pool.query(
      `
      UPDATE reports
      SET status_id = (SELECT id FROM report_statuses WHERE code = 'RESOLVED'),
          version = version + 1
      WHERE id = ?
      `,
      [id]
    );

    const [[updated]] = await pool.query(
      `
      SELECT 
        r.*, 
        tt.name AS threat_type,
        rs.code AS status_code
      FROM reports r
      JOIN threat_types tt ON r.type_id = tt.id
      JOIN report_statuses rs ON r.status_id = rs.id
      WHERE r.id = ?
      `,
      [id]
    );

    res.json({ ok: true, report: updated });
  } catch (err) {
    console.error("RESOLVE ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;