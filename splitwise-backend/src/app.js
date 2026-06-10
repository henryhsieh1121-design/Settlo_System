require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const pool = require('./db/pool');
const errorHandler = require('./middleware/errorHandler');

const authRouter = require('./routes/auth');
const groupsRouter = require('./routes/groups');
const expensesRouter = require('./routes/expenses');

// 啟動時依序執行 migrations/ 目錄下所有 .sql 檔（均為 idempotent）
async function runMigrations() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    console.log(`[migration] ${file} ✓`);
  }
}

const app = express();

// 合併部署時前後端同源，不需要 CORS；分開部署時需設定 FRONTEND_URL
const corsOrigin = process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173');
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json());

// Auth rate limiter：每 IP 15 分鐘最多 10 次登入/註冊，防暴力破解
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '請求過於頻繁，請稍後再試' },
});

// 健康檢查端點（Railway 部署喚醒用）
app.get('/health', (_req, res) => res.json({ status: 'ok', service: '分帳無痛 API' }));

// 路由掛載
app.use('/auth', authLimiter, authRouter);
app.use('/groups', groupsRouter);         // 包含 /groups/:id/expenses (POST/GET) 和 /groups/:id/settle
app.use('/expenses', expensesRouter);     // 僅處理 DELETE /expenses/:id

// 統一錯誤處理（必須放在所有路由之後）
app.use(errorHandler);

// 合併部署：production 時 Express 直接 serve React build 檔案（build 時複製到 public/）
if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(__dirname, '../public');
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[分帳無痛] 後端伺服器啟動於 http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[migration] 執行失敗，伺服器未啟動:', err.message);
    process.exit(1);
  });

module.exports = app;
