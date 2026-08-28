const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const pool = require("../db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── تأكد من وجود جدول الإعدادات (إنشاؤه تلقائياً) ────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        lab_name    VARCHAR(255) NOT NULL DEFAULT '',
        lab_address VARCHAR(255) NOT NULL DEFAULT '',
        lab_phone   VARCHAR(20)  NOT NULL DEFAULT '',
        lab_phone2  VARCHAR(20)  DEFAULT NULL,
        lab_logo    LONGTEXT     DEFAULT NULL,
        updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (err) {
    console.error("فحص جدول الإعدادات فشل:", err.message);
  }
})();

// ── View Engine ──────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Middleware ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(express.json());
app.use(methodOverride("_method"));

// ── Global locals (passed to every view) ─────────────────
app.use(async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM settings WHERE id = 1 LIMIT 1"
    );
    const s = rows[0] || {};
    res.locals.LAB_NAME = s.lab_name || process.env.LAB_NAME || "مركز النور للتحاليل";
    res.locals.LAB_ADDRESS = s.lab_address || process.env.LAB_ADDRESS || "شارع التحرير، القاهرة";
    res.locals.LAB_PHONE = s.lab_phone || process.env.LAB_PHONE || "01000000000";
    res.locals.LAB_PHONE2 = s.lab_phone2 || "";
    res.locals.LAB_LOGO = s.lab_logo || null;
  } catch (err) {
    res.locals.LAB_NAME = process.env.LAB_NAME || "مركز النور للتحاليل";
    res.locals.LAB_ADDRESS = process.env.LAB_ADDRESS || "شارع التحرير، القاهرة";
    res.locals.LAB_PHONE = process.env.LAB_PHONE || "01000000000";
    res.locals.LAB_PHONE2 = "";
    res.locals.LAB_LOGO = null;
  }
  res.locals.currentPath = req.path;
  next();
});

// ── Routes ───────────────────────────────────────────────
app.use("/", require("./routes/index"));
app.use("/invoices", require("./routes/invoices"));
app.use("/tests", require("./routes/tests"));
app.use("/patients", require("./routes/patients"));
app.use("/settings", require("./routes/settings"));

// ── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res
    .status(404)
    .render("error", { title: "خطأ 404", message: "الصفحة غير موجودة" });
});

// ── Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).render("error", {
    title: "خطأ في الخادم",
    message: err.message || "حدث خطأ غير متوقع",
  });
});

// ── Start ────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
  });
}

module.exports = app;
