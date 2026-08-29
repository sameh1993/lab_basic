const express = require("express");
const router = express.Router();
const pool = require("../../db");
const { hashPassword, verifyPassword } = require("../middleware/auth");

const PW_ERR_MESSAGES = {
  bad_current: "كلمة المرور الحالية غير صحيحة",
  short: "كلمة المرور الجديدة يجب ألا تقل عن 5 أحرف",
  mismatch: "كلمتا المرور غير متطابقتين",
};

function pwErrorFromQuery(code) {
  return code && PW_ERR_MESSAGES[code] ? PW_ERR_MESSAGES[code] : null;
}

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
      pwSaved: !!req.query.pw_saved,
      pwError: pwErrorFromQuery(req.query.pw_err),
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
      `INSERT INTO settings (id, lab_name, lab_address, lab_phone, lab_phone2, lab_logo)
       VALUES (1, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         lab_name    = VALUES(lab_name),
         lab_address = VALUES(lab_address),
         lab_phone   = VALUES(lab_phone),
         lab_phone2  = VALUES(lab_phone2),
         lab_logo    = VALUES(lab_logo)`,
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

// ── تغيير كلمة مرور المستخدم ───────────────────────────
router.post("/password", async (req, res, next) => {
  try {
    const { current_password = "", new_password = "", confirm_password = "" } =
      req.body;

    const [rows] = await pool.query(
      "SELECT admin_pass_hash FROM settings WHERE id = 1 LIMIT 1"
    );
    const storedHash = rows[0] && rows[0].admin_pass_hash;
    const currentOk = storedHash
      ? verifyPassword(current_password, storedHash)
      : current_password === (process.env.ADMIN_PASS || "1234");

    if (!currentOk) return res.redirect("/settings?pw_err=bad_current");
    if (!new_password || new_password.length < 5)
      return res.redirect("/settings?pw_err=short");
    if (new_password !== confirm_password)
      return res.redirect("/settings?pw_err=mismatch");

    const hash = hashPassword(new_password);
    await pool.query(
      `INSERT INTO settings (id, admin_pass_hash) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE admin_pass_hash = VALUES(admin_pass_hash)`,
      [hash]
    );
    res.redirect("/settings?pw_saved=1");
  } catch (err) {
    next(err);
  }
});

module.exports = router;