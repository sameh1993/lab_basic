const express = require("express");
const router = express.Router();
const pool = require("../../db");

router.get("/", async (req, res, next) => {
  try {
    // إحصائيات اليوم
    const [[todayStats]] = await pool.query(`
      SELECT
        COUNT(*)                     AS count,
        COALESCE(SUM(total_amount), 0) AS revenue
      FROM invoices
      WHERE DATE(created_at) = CURDATE()
    `);

    // إحصائيات الشهر
    const [[monthStats]] = await pool.query(`
      SELECT
        COUNT(*)                     AS count,
        COALESCE(SUM(total_amount), 0) AS revenue
      FROM invoices
      WHERE MONTH(created_at) = MONTH(CURDATE())
        AND YEAR(created_at)  = YEAR(CURDATE())
    `);

    // معلق النتائج
    const [[pendingRow]] = await pool.query(`
      SELECT COUNT(*) AS count FROM invoices WHERE status = 'pending'
    `);

    // آخر 10 فواتير مع أسماء التحاليل
    const [recentInvoices] = await pool.query(`
      SELECT
        i.*,
        GROUP_CONCAT(ii.test_name ORDER BY ii.id SEPARATOR ' · ') AS tests_list
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT 10
    `);

    // إحصائيات التحاليل الأكثر طلباً
    const [topTests] = await pool.query(`
      SELECT
        ii.test_name,
        COUNT(*) AS total
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      WHERE MONTH(i.created_at) = MONTH(CURDATE())
        AND YEAR(i.created_at)  = YEAR(CURDATE())
      GROUP BY ii.test_name
      ORDER BY total DESC
      LIMIT 5
    `);

    res.render("dashboard", {
      title: "الرئيسية",
      todayCount: todayStats.count,
      todayRevenue: parseFloat(todayStats.revenue),
      monthCount: monthStats.count,
      monthRevenue: parseFloat(monthStats.revenue),
      pendingCount: pendingRow.count,
      recentInvoices,
      topTests,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
