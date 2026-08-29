const express = require("express");
const router = express.Router();
const pool = require("../../db");
const {
  signToken,
  parseCookies,
  verifyToken,
  verifyPassword,
} = require("../middleware/auth");

// ── إحضار باسورد المستخدم من قاعدة البيانات (إن وُجد) ──────
async function getStoredPassHash() {
  try {
    const [rows] = await pool.query(
      "SELECT admin_pass_hash FROM settings WHERE id = 1 LIMIT 1"
    );
    return (rows[0] && rows[0].admin_pass_hash) || null;
  } catch (err) {
    if (err.code !== "ER_NO_SUCH_TABLE") throw err;
    return null;
  }
}

// ── صفحة تسجيل الدخول ─────────────────────────────────────
router.get("/login", (req, res) => {
  if (verifyToken(parseCookies(req).auth_token)) return res.redirect("/");
  res.render("login", { title: "تسجيل الدخول", error: null });
});

// ── تسجيل الدخول ──────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { username = "", password = "" } = req.body;
    const ADMIN_USER = process.env.ADMIN_USER || "admin";
    const ADMIN_PASS = process.env.ADMIN_PASS || "1234";

    const storedHash = await getStoredPassHash();
    const passOk = storedHash
      ? verifyPassword(password, storedHash)
      : password === ADMIN_PASS;

    if (username.trim() === ADMIN_USER && passOk) {
      res.setHeader(
        "Set-Cookie",
        `auth_token=${signToken(ADMIN_USER)}; HttpOnly; Path=/; Max-Age=43200; SameSite=Lax`
      );
      return res.redirect("/");
    }
    res
      .status(401)
      .render("login", {
        title: "تسجيل الدخول",
        error: "اسم المستخدم أو كلمة المرور غير صحيحة",
      });
  } catch (err) {
    next(err);
  }
});

// ── تسجيل الخروج ──────────────────────────────────────────
router.post("/logout", (req, res) => {
  res.setHeader("Set-Cookie", "auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  res.redirect("/login");
});

module.exports = router;