const { Pool } = require('pg');
require('dotenv').config();

// 建立 PostgreSQL 連線池，透過 DATABASE_URL 連接資料庫
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
