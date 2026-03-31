const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',
  database:        process.env.DB_NAME     || 'lab_basic',
  waitForConnections: true,
  connectionLimit: 10,
  charset:         'utf8mb4'
});

// Test connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL متصل بنجاح');
    conn.release();
  } catch (err) {
    console.error('❌ فشل الاتصال بـ MySQL:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;
