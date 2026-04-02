const express = require("express");
const router = express.Router();
const pool = require("../../db");

// ── API: بحث سريع للـ autocomplete ───────────────────────
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);
    const [rows] = await pool.query(
      `SELECT id, full_name, phone, gender,
              TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) AS age
       FROM patients
       WHERE full_name LIKE ? OR phone LIKE ? OR national_id LIKE ?
       LIMIT 8`,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── قائمة المرضى ─────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { search = "", gender = "" } = req.query;
    const params = [],
      clauses = [];

    let sql = `
      SELECT p.*,
        TIMESTAMPDIFF(YEAR, p.birth_date, CURDATE())  AS age,
        COUNT(DISTINCT i.id)                           AS invoice_count,
        COALESCE(SUM(i.total_amount), 0)               AS total_spent,
        COALESCE(SUM(i.paid_amount), 0)                AS total_paid,
        MAX(i.created_at)                              AS last_visit
      FROM patients p
      LEFT JOIN invoices i ON i.patient_id = p.id
    `;
    if (search) {
      clauses.push(
        "(p.full_name LIKE ? OR p.phone LIKE ? OR p.national_id LIKE ?)"
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (gender) {
      clauses.push("p.gender = ?");
      params.push(gender);
    }
    if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
    sql += " GROUP BY p.id ORDER BY p.full_name ASC";

    const [patients] = await pool.query(sql, params);
    res.render("patients/index", {
      title: "سجل المرضى",
      patients,
      search,
      gender,
    });
  } catch (err) {
    next(err);
  }
});

// ── إضافة مريض جديد ──────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const {
      full_name,
      phone,
      phone2,
      national_id,
      gender,
      birth_date,
      blood_type,
      address,
      notes,
    } = req.body;
    if (!full_name) throw new Error("اسم المريض مطلوب");
    const [result] = await pool.query(
      `INSERT INTO patients (full_name, phone, phone2, national_id, gender, birth_date, blood_type, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        phone || null,
        phone2 || null,
        national_id || null,
        gender || "ذكر",
        birth_date || null,
        blood_type || null,
        address || null,
        notes || null,
      ]
    );
    res.redirect(`/patients/${result.insertId}`);
  } catch (err) {
    next(err);
  }
});

// ── ملف المريض ───────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const [[patient]] = await pool.query(
      `SELECT *, TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) AS age FROM patients WHERE id = ?`,
      [req.params.id]
    );
    if (!patient)
      return res
        .status(404)
        .render("error", { title: "404", message: "المريض غير موجود" });

    // كل فواتير المريض
    const [invoices] = await pool.query(
      `SELECT i.*, (i.total_amount - i.paid_amount) AS remaining_amount,
              COUNT(ii.id) AS item_count
       FROM invoices i
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       WHERE i.patient_id = ?
       GROUP BY i.id
       ORDER BY i.created_at DESC`,
      [patient.id]
    );

    // كل التحاليل التي أجراها هذا المريض (مجمّعة وبعدد المرات)
    const [testHistory] = await pool.query(
      `SELECT ii.test_name, ii.test_category,
              COUNT(*)           AS times_done,
              MAX(i.created_at)  AS last_date,
              SUM(ii.price)      AS total_paid
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.patient_id = ?
       GROUP BY ii.test_name, ii.test_category
       ORDER BY times_done DESC`,
      [patient.id]
    );

    // ملخص مالي
    const totalSpent = invoices.reduce(
      (s, i) => s + parseFloat(i.total_amount),
      0
    );
    const totalPaid = invoices.reduce(
      (s, i) => s + parseFloat(i.paid_amount),
      0
    );
    const totalRemaining = invoices.reduce(
      (s, i) => s + parseFloat(i.remaining_amount),
      0
    );

    res.render("patients/show", {
      title: patient.full_name,
      patient,
      invoices,
      testHistory,
      totalSpent,
      totalPaid,
      totalRemaining,
    });
  } catch (err) {
    next(err);
  }
});

// ── تعديل مريض ───────────────────────────────────────────
router.put("/:id", async (req, res, next) => {
  try {
    const {
      full_name,
      phone,
      phone2,
      national_id,
      gender,
      birth_date,
      blood_type,
      address,
      notes,
    } = req.body;
    if (!full_name) throw new Error("اسم المريض مطلوب");
    await pool.query(
      `UPDATE patients SET full_name=?, phone=?, phone2=?, national_id=?, gender=?,
              birth_date=?, blood_type=?, address=?, notes=? WHERE id=?`,
      [
        full_name.trim(),
        phone || null,
        phone2 || null,
        national_id || null,
        gender || "ذكر",
        birth_date || null,
        blood_type || null,
        address || null,
        notes || null,
        req.params.id,
      ]
    );
    res.redirect(`/patients/${req.params.id}`);
  } catch (err) {
    next(err);
  }
});

// ── حذف مريض ─────────────────────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM patients WHERE id = ?", [req.params.id]);
    res.redirect("/patients");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
