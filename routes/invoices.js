const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const QRCode  = require('qrcode');

function calcPaymentStatus(paid, total) {
  const p = parseFloat(paid), t = parseFloat(total);
  if (p <= 0) return 'unpaid';
  if (p >= t) return 'paid';
  return 'partial';
}

// ── قائمة الفواتير ────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search = '', status = '', payment_status = '', from = '', to = '', patient_id = '' } = req.query;
    let sql = `
      SELECT i.*, (i.total_amount - i.paid_amount) AS remaining_amount,
             COUNT(ii.id) AS item_count,
             p.id AS p_id, p.full_name AS p_full_name
      FROM invoices i
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN patients p       ON p.id = i.patient_id
    `;
    const params = [], clauses = [];
    if (search) {
      clauses.push('(i.patient_name LIKE ? OR i.invoice_number LIKE ? OR i.patient_phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status)         { clauses.push('i.status = ?');         params.push(status); }
    if (payment_status) { clauses.push('i.payment_status = ?'); params.push(payment_status); }
    if (patient_id)     { clauses.push('i.patient_id = ?');     params.push(patient_id); }
    if (from) { clauses.push('DATE(i.created_at) >= ?'); params.push(from); }
    if (to)   { clauses.push('DATE(i.created_at) <= ?'); params.push(to); }
    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
    sql += ' GROUP BY i.id ORDER BY i.created_at DESC';

    const [invoices] = await pool.query(sql, params);
    const totalRevenue   = invoices.reduce((s, i) => s + parseFloat(i.total_amount),    0);
    const totalPaid      = invoices.reduce((s, i) => s + parseFloat(i.paid_amount),      0);
    const totalRemaining = invoices.reduce((s, i) => s + parseFloat(i.remaining_amount), 0);

    // إذا كان الفلتر على مريض معين، جلب اسمه
    let filterPatient = null;
    if (patient_id) {
      const [[fp]] = await pool.query('SELECT id, full_name FROM patients WHERE id = ?', [patient_id]);
      filterPatient = fp || null;
    }

    res.render('invoices/index', {
      title: 'الفواتير', invoices,
      totalRevenue, totalPaid, totalRemaining,
      search, status, payment_status, from, to,
      patient_id, filterPatient
    });
  } catch (err) { next(err); }
});

// ── نموذج طلب جديد ───────────────────────────────────────
router.get('/new', async (req, res, next) => {
  try {
    const [tests] = await pool.query(
      'SELECT * FROM tests_catalog WHERE is_active = 1 ORDER BY category, name'
    );
    const grouped = tests.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    }, {});

    // مريض مختار مسبقاً من الـ URL
    let prePatient = null;
    if (req.query.patient_id) {
      const [[pp]] = await pool.query(
        `SELECT *, TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) AS age FROM patients WHERE id = ?`,
        [req.query.patient_id]
      );
      prePatient = pp || null;
    }

    res.render('invoices/new', { title: 'طلب جديد', tests, grouped, prePatient });
  } catch (err) { next(err); }
});

// ── إنشاء فاتورة ─────────────────────────────────────────
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { patient_name, patient_phone, patient_age, patient_gender, doctor_name, notes } = req.body;
    const paid_amount    = parseFloat(req.body.paid_amount)  || 0;
    const payment_method = req.body.payment_method           || 'cash';
    const patient_id     = req.body.patient_id ? parseInt(req.body.patient_id) : null;

    let test_ids = req.body.test_ids;
    if (!test_ids) throw new Error('يجب اختيار تحليل واحد على الأقل');
    if (!Array.isArray(test_ids)) test_ids = [test_ids];
    test_ids = test_ids.map(Number).filter(Boolean);
    if (!test_ids.length) throw new Error('يجب اختيار تحليل واحد على الأقل');

    const [testRows] = await conn.query(
      `SELECT * FROM tests_catalog WHERE id IN (${test_ids.map(() => '?').join(',')})`,
      test_ids
    );
    const total      = testRows.reduce((s, t) => s + parseFloat(t.price), 0);
    const safe_paid  = Math.min(Math.max(paid_amount, 0), total);
    const pay_status = calcPaymentStatus(safe_paid, total);

    const [result] = await conn.query(`
      INSERT INTO invoices
        (patient_id, invoice_number, patient_name, patient_phone, patient_age,
         patient_gender, doctor_name, total_amount, paid_amount, payment_status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [patient_id, 'TEMP', patient_name, patient_phone||null, patient_age||null,
        patient_gender||'ذكر', doctor_name||null, total, safe_paid, pay_status, notes||null]);

    const invoiceId     = result.insertId;
    const invoiceNumber = `INV-${String(invoiceId).padStart(5, '0')}`;
    await conn.query('UPDATE invoices SET invoice_number = ? WHERE id = ?', [invoiceNumber, invoiceId]);

    if (testRows.length) {
      await conn.query(
        'INSERT INTO invoice_items (invoice_id, test_id, test_name, test_category, price) VALUES ?',
        [testRows.map(t => [invoiceId, t.id, t.name, t.category, t.price])]
      );
    }
    if (safe_paid > 0) {
      await conn.query(
        'INSERT INTO payments (invoice_id, amount, payment_method, note) VALUES (?, ?, ?, ?)',
        [invoiceId, safe_paid, payment_method, 'مقدم عند الحجز']
      );
    }

    await conn.commit();
    res.redirect(`/invoices/${invoiceId}`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// ── عرض فاتورة واحدة ─────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const [[invoice]] = await pool.query(
      `SELECT i.*, (i.total_amount - i.paid_amount) AS remaining_amount,
              p.id AS p_id, p.full_name AS p_full_name
       FROM invoices i
       LEFT JOIN patients p ON p.id = i.patient_id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (!invoice) return res.status(404).render('error', { title: '404', message: 'الفاتورة غير موجودة' });

    const [items]    = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id', [invoice.id]);
    const [payments] = await pool.query('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at ASC', [invoice.id]);

    const remaining = parseFloat(invoice.remaining_amount);
    const qrText = [
      `رقم الفاتورة: ${invoice.invoice_number}`,
      `المريض: ${invoice.patient_name}`,
      `التاريخ: ${new Date(invoice.created_at).toLocaleDateString('ar-EG')}`,
      `الإجمالي: ${parseFloat(invoice.total_amount).toFixed(2)} ج.م`,
      `المدفوع: ${parseFloat(invoice.paid_amount).toFixed(2)} ج.م`,
      `الباقي: ${remaining.toFixed(2)} ج.م`
    ].join('\n');

    const qrCode = await QRCode.toDataURL(qrText, { width: 110, margin: 1, color: { dark: '#0F6E56', light: '#ffffff' } });

    res.render('invoices/show', {
      title: `فاتورة ${invoice.invoice_number}`,
      invoice, items, payments, qrCode
    });
  } catch (err) { next(err); }
});

// ── إضافة دفعة ───────────────────────────────────────────
router.post('/:id/pay', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const pay = parseFloat(req.body.amount);
    if (!pay || pay <= 0) throw new Error('مبلغ الدفعة غير صحيح');

    const [[inv]] = await conn.query('SELECT total_amount, paid_amount FROM invoices WHERE id = ?', [req.params.id]);
    if (!inv) throw new Error('الفاتورة غير موجودة');

    const remaining  = parseFloat(inv.total_amount) - parseFloat(inv.paid_amount);
    const actual_pay = Math.min(pay, remaining);
    if (actual_pay <= 0) throw new Error('الفاتورة مدفوعة بالكامل');

    const new_paid   = parseFloat(inv.paid_amount) + actual_pay;
    const new_status = calcPaymentStatus(new_paid, inv.total_amount);

    await conn.query('UPDATE invoices SET paid_amount = ?, payment_status = ? WHERE id = ?', [new_paid, new_status, req.params.id]);
    await conn.query('INSERT INTO payments (invoice_id, amount, payment_method, note) VALUES (?, ?, ?, ?)',
      [req.params.id, actual_pay, req.body.payment_method || 'cash', req.body.note || null]);

    await conn.commit();
    res.redirect(`/invoices/${req.params.id}`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
});

// ── تحديث الحالة ─────────────────────────────────────────
router.post('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'completed', 'cancelled'].includes(status)) throw new Error('حالة غير صحيحة');
    await pool.query('UPDATE invoices SET status = ? WHERE id = ?', [status, req.params.id]);
    res.redirect(`/invoices/${req.params.id}`);
  } catch (err) { next(err); }
});

// ── حذف فاتورة ───────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.redirect('/invoices');
  } catch (err) { next(err); }
});

module.exports = router;
