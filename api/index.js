const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── View Engine ──────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Middleware ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// ── Global locals (passed to every view) ─────────────────
app.use((req, res, next) => {
  res.locals.LAB_NAME = process.env.LAB_NAME || "مركز النور للتحاليل";
  res.locals.LAB_ADDRESS = process.env.LAB_ADDRESS || "شارع التحرير، القاهرة";
  res.locals.LAB_PHONE = process.env.LAB_PHONE || "01000000000";
  res.locals.currentPath = req.path;
  next();
});

// ── Routes ───────────────────────────────────────────────
app.use("/", require("./routes/index"));
app.use("/invoices", require("./routes/invoices"));
app.use("/tests", require("./routes/tests"));
app.use("/patients", require("./routes/patients"));

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
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
});
