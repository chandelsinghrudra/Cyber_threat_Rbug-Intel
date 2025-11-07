import express from "express";
import { pool } from "../db.js";
import { io } from "../index.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, phone, location, type_id, description } = req.body;

    const [result] = await pool.query(
      `INSERT INTO reports (reporter_name, phone, location, type_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [name, phone, location, type_id, description]
    );

    const insertId = result.insertId;

    const [[newReport]] = await pool.query(
      `SELECT r.*, tt.name AS threat_type, rs.code AS status_code
       FROM reports r
       JOIN threat_types tt ON r.type_id = tt.id
       JOIN report_statuses rs ON r.status_id = rs.id
       WHERE r.id = ?`,
      [insertId]
    );

    io.emit("report:new", newReport);

    res.json({ ok: true, report: newReport });
  } catch (err) {
    console.error("INSERT ERROR:", err);
    res.json({ ok: false, error: "Failed to submit report" });
  }
});

/* -------------------------------------------
   LIST: All Reports (with filters)
--------------------------------------------*/
router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query;

    let sql = `
      SELECT r.*, tt.name AS threat_type, rs.code AS status_code
      FROM reports r
      JOIN threat_types tt ON r.type_id = tt.id
      JOIN report_statuses rs ON r.status_id = rs.id
      WHERE 1
    `;

    const params = [];

    if (status) {
      sql += ` AND rs.code = ? `;
      params.push(status);
    }

    if (search) {
      sql += ` AND (
        r.reporter_name LIKE ? OR 
        r.phone LIKE ? OR
        r.location LIKE ?
      ) `;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY r.created_at DESC `;

    const [rows] = await pool.query(sql, params);

    res.json({ ok: true, reports: rows });
  } catch (err) {
    console.error("LIST ERROR:", err);
    res.json({ ok: false, error: "Failed to fetch reports" });
  }
});


router.patch("/:id/status", async (req, res) => {
  const id = req.params.id;
  const { new_status, version } = req.body;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT version FROM reports WHERE id = ? FOR UPDATE",
      [id]
    );

    if (rows.length === 0) {
      throw new Error("Report not found");
    }

    const currentVersion = rows[0].version;

    if (currentVersion !== version) {
      await conn.rollback();
      return res.json({ ok: false, error: "Version mismatch" });
    }

    const newVersion = version + 1;

    await conn.query(
      `UPDATE reports 
       SET status_id = (SELECT id FROM report_statuses WHERE code = ?),
           version = ?
       WHERE id = ?`,
      [new_status, newVersion, id]
    );

    const [[updated]] = await conn.query(
      `SELECT r.*, tt.name AS threat_type, rs.code AS status_code
       FROM reports r
       JOIN threat_types tt ON r.type_id = tt.id
       JOIN report_statuses rs ON r.status_id = rs.id
       WHERE r.id = ?`,
      [id]
    );

    await conn.commit();

    io.emit("report:updated", updated);

    res.json({ ok: true, report: updated });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    await conn.rollback();
    res.json({ ok: false, error: "Failed to update status" });
  } finally {
    conn.release();
  }
});


router.patch("/:id/resolve", async (req, res) => {
  const id = req.params.id;
  const { version } = req.body;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT version FROM reports WHERE id = ? FOR UPDATE",
      [id]
    );

    if (rows.length === 0) {
      throw new Error("Report not found");
    }

    const currentVersion = rows[0].version;

 
    if (currentVersion !== version) {
      await conn.rollback();
      return res.json({ ok: false, error: "Version mismatch" });
    }

    const newVersion = version + 1;

    await conn.query(
      `UPDATE reports 
       SET status_id = (SELECT id FROM report_statuses WHERE code = 'RESOLVED'),
           version = ?
       WHERE id = ?`,
      [newVersion, id]
    );

    const [[updated]] = await conn.query(
      `SELECT r.*, tt.name AS threat_type, rs.code AS status_code
       FROM reports r
       JOIN threat_types tt ON r.type_id = tt.id
       JOIN report_statuses rs ON r.status_id = rs.id
       WHERE r.id = ?`,
      [id]
    );

    await conn.commit();

    io.emit("report:updated", updated);

    res.json({ ok: true, report: updated });

  } catch (err) {
    console.error("RESOLVE ERROR:", err);
    await conn.rollback();
    res.json({ ok: false, error: "Failed to resolve report" });
  } finally {
    conn.release();
  }
});


export default router;
