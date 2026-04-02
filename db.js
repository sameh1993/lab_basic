const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lab_basic",
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
  charset: "utf8mb4",
});

// Test connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("MySQL connected successfully");
    conn.release();
  } catch (err) {
    console.error("MySQL connection failed:", err.message);
    if (process.env.DB_HOST?.includes(".proxy.rlwy.net") && !process.env.DB_PORT) {
      console.error(
        "Missing DB_PORT in .env. Railway MySQL usually requires a custom port."
      );
    }
    process.exit(1);
  }
})();

module.exports = pool;
