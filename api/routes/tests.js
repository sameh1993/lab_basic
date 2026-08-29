const express = require('express');
const router = express.Router();
const pool = require('../../db');

// ── قائمة التحاليل ────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search = '', category = '' } = req.query;

    let sql = 'SELECT * FROM tests_catalog';
    const params = [];
    const clauses = [];

    if (search) {
      clauses.push('(name LIKE ? OR category LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      clauses.push('category = ?');
      params.push(category);
    }

    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
    sql += ' ORDER BY category, name';

    const [tests] = await pool.query(sql, params);
    const [categories] = await pool.query(
      'SELECT DISTINCT category FROM tests_catalog ORDER BY category'
    );

    res.render('tests/index', {
      title: 'كتالوج التحاليل',
      tests,
      categories: categories.map(c => c.category),
      search,
      category
    });
  } catch (err) {
    next(err);
  }
});

// ── إضافة تحليل ──────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { name, category, price, cost } = req.body;
    if (!name || !category || !price) throw new Error('جميع الحقول مطلوبة');
    await pool.query(
      'INSERT INTO tests_catalog (name, category, price, cost) VALUES (?, ?, ?, ?)',
      [name.trim(), category.trim(), parseFloat(price), parseFloat(cost) || 0]
    );
    res.redirect('/tests');
  } catch (err) {
    next(err);
  }
});

// ── تعديل تحليل ──────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { name, category, price, cost, is_active } = req.query;
    await pool.query(
      'UPDATE tests_catalog SET name = ?, category = ?, price = ?, cost = ?, is_active = ? WHERE id = ?',
      [name.trim(), category.trim(), parseFloat(price), parseFloat(cost) || 0, is_active === '1' ? 1 : 0, req.params.id]
    );
    res.redirect('/tests');
  } catch (err) {
    next(err);
  }
});

// ── حذف تحليل ────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tests_catalog WHERE id = ?', [req.params.id]);
    res.redirect('/tests');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
