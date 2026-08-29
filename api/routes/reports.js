const express = require("express");
const router = express.Router();
const pool = require("../../db");

function monthDefaults() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return { from, to };
}

// ── تقرير الربح والخسارة ─────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const def = monthDefaults();
    const from = req.query.from || def.from;
    const to = req.query.to || def.to;

    // فواتير الفترة (غير ملغية) مع تكلفتها
    const [invoices] = await pool.query(
      `SELECT i.id, i.invoice_number, i.patient_name, i.created_at,
              i.total_amount, i.paid_amount,
              COUNT(ii.id) AS item_count,
              COALESCE(SUM(ii.cost), 0) AS items_cost
       FROM invoices i
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       WHERE i.status <> 'cancelled' AND DATE(i.created_at) BETWEEN ? AND ?
       GROUP BY i.id
       ORDER BY i.created_at DESC`,
      [from, to]
    );

    const revenue = invoices.reduce(
      (s, i) => s + parseFloat(i.total_amount),
      0
    );
    const cashReceived = invoices.reduce(
      (s, i) => s + parseFloat(i.paid_amount),
      0
    );
    const costOfTests = invoices.reduce(
      (s, i) => s + parseFloat(i.items_cost),
      0
    );
    const grossProfit = revenue - costOfTests;

    // مصروفات الفترة
    const [expenses] = await pool.query(
      `SELECT * FROM expenses WHERE DATE(created_at) BETWEEN ? AND ? ORDER BY created_at DESC`,
      [from, to]
    );
    const expensesTotal = expenses.reduce(
      (s, e) => s + parseFloat(e.amount),
      0
    );
    const netProfit = grossProfit - expensesTotal;

    // فواتير قديمة بتكلفة صفر (قبل إضافة التكلفة)
    const [[costless]] = await pool.query(
      `SELECT COUNT(*) AS n
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.status <> 'cancelled' AND DATE(i.created_at) BETWEEN ? AND ? AND ii.cost = 0`,
      [from, to]
    );

    res.render("reports/index", {
      title: "تقرير الربح والخسارة",
      from,
      to,
      invoices,
      revenue,
      cashReceived,
      costOfTests,
      grossProfit,
      expenses,
      expensesTotal,
      netProfit,
      costless: costless.n,
    });
  } catch (err) {
    next(err);
  }
});

// ── إضافة مصروف ──────────────────────────────────────────
router.post("/expenses", async (req, res, next) => {
  try {
    const { description, amount, category, expense_date, from, to } = req.body;
    if (!description || !description.trim())
      throw new Error("وصف المصروف مطلوب");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) throw new Error("مبلغ المصروف غير صحيح");

    await pool.query(
      "INSERT INTO expenses (description, amount, category, created_at) VALUES (?, ?, ?, ?)",
      [
        description.trim(),
        amt,
        (category || "عام").trim(),
        expense_date || new Date(),
      ]
    );
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    res.redirect(`/reports${q.toString() ? `?${q}` : ""}`);
  } catch (err) {
    next(err);
  }
});

// ── حذف مصروف ────────────────────────────────────────────
router.delete("/expenses/:id", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM expenses WHERE id = ?", [req.params.id]);
    res.redirect(req.query.return || "/reports");
  } catch (err) {
    next(err);
  }
});

module.exports = router;