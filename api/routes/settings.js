const express = require("express");
const router = express.Router();
const pool = require("../../db");

// ── عرض إعدادات المركز ─────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    let s = {};
    try {
      const [rows] = await pool.query(
        "SELECT * FROM settings WHERE id = 1 LIMIT 1"
      );
      s = rows[0] || {};
    } catch (err) {
      if (err.code !== "ER_NO_SUCH_TABLE") throw err;
    }
    res.render("settings/index", {
      title: "إعدادات المركز",
      settings: {
        lab_name: s.lab_name || process.env.LAB_NAME || "",
        lab_address: s.lab_address || process.env.LAB_ADDRESS || "",
        lab_phone: s.lab_phone || process.env.LAB_PHONE || "",
        lab_phone2: s.lab_phone2 || "",
        lab_logo: s.lab_logo || null,
      },
      saved: !!req.query.saved,
    });
  } catch (err) {
    next(err);
  }
});

// ── حفظ إعدادات المركز ─────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { lab_name, lab_address, lab_phone, lab_phone2, lab_logo, remove_logo } =
      req.body;
    if (!lab_name || !lab_name.trim()) throw new Error("اسم المركز مطلوب");

    let logo = lab_logo && lab_logo.trim() ? lab_logo.trim() : null;
    if (remove_logo === "1") logo = null;

    await pool.query(
      `REPLACE INTO settings (id, lab_name, lab_address, lab_phone, lab_phone2, lab_logo)
       VALUES (1, ?, ?, ?, ?, ?)`,
      [
        lab_name.trim(),
        (lab_address || "").trim(),
        (lab_phone || "").trim(),
        (lab_phone2 || "").trim(),
        logo,
      ]
    );
    res.redirect("/settings?saved=1");
  } catch (err) {
    next(err);
  }
});

module.exports = router;