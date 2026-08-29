const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const pool = require("../db");
const { authRequired } = require("./middleware/auth");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── تأكد من وجود جداول/أعمدة التقارير (إنشاؤها تلقائياً) ──
async function ensureColumn(table, column, ddl) {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [table, column]
    );
    if (!rows[0].n) await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  } catch (err) {
    console.error(`إضافة عمود ${column} في ${table} فشلت:`, err.message);
  }
}

(async () => {
  try {
    // 1) جدول إعدادات المركز
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

    // 2) جدول المصروفات
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        amount      DECIMAL(10,2) NOT NULL,
        category    VARCHAR(100)  DEFAULT 'عام',
        created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 3) كلمة مرور المستخدم (المخزنة في إعدادات المركز)
    await ensureColumn(
      "settings",
      "admin_pass_hash",
      "admin_pass_hash VARCHAR(255) DEFAULT NULL"
    );

    // 4) أعمدة التكلفة
    await ensureColumn(
      "tests_catalog",
      "cost",
      "cost DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price"
    );
    await ensureColumn(
      "invoice_items",
      "cost",
      "cost DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price"
    );
  } catch (err) {
    console.error("فحص جداول التقارير فشل:", err.message);
  }
})();

// ── View Engine ──────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Middleware ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(express.json());
app.use(
  methodOverride((req) => {
    // تقبل _method من رابط الصفحة أو من داخل الـ form (الاثنين)
    const query = new URL(req.url, "http://localhost").searchParams.get(
      "_method"
    );
    if (query) return query;
    return req.body && req.body._method ? req.body._method : undefined;
  })
);

// ── تسجيل الطلبات (method + route) ───────────────────────
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

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
app.use("/", require("./routes/auth"));
app.use(authRequired);
app.use("/", require("./routes/index"));
app.use("/invoices", require("./routes/invoices"));
app.use("/tests", require("./routes/tests"));
app.use("/patients", require("./routes/patients"));
app.use("/settings", require("./routes/settings"));
app.use("/reports", require("./routes/reports"));

// ── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res
    .status(404)
    .render("error", { title: "خطأ 404", message: "الصفحة غير موجودة" });
});

// ── Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.locals.LAB_NAME = res.locals.LAB_NAME || process.env.LAB_NAME || "مركز النور للتحاليل";
  res.locals.LAB_ADDRESS = res.locals.LAB_ADDRESS || process.env.LAB_ADDRESS || "شارع التحرير، القاهرة";
  res.locals.LAB_PHONE = res.locals.LAB_PHONE || process.env.LAB_PHONE || "01000000000";
  res.locals.LAB_PHONE2 = res.locals.LAB_PHONE2 || "";
  res.locals.LAB_LOGO = res.locals.LAB_LOGO || null;
  res.locals.currentPath = "";
  res.status(err.status || err.statusCode || 500).render("error", {
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
