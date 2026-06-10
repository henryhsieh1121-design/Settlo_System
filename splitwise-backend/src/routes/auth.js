const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 產生有效期 7 天的 JWT token
const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /auth/register - 新用戶註冊，回傳 JWT token
router.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: '姓名、Email 和密碼均為必填' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密碼至少需要 6 個字元' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '此 Email 已被註冊' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // 暱稱預設與姓名相同，之後可在個人資料頁修改
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, nickname)
       VALUES ($1, $2, $3, $1)
       RETURNING id, name, nickname, email, created_at`,
      [name, email.toLowerCase(), password_hash]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login - 用戶登入，驗證密碼後回傳 JWT token
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email 和密碼均為必填' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email 或密碼錯誤' });
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Email 或密碼錯誤' });
    }

    const token = generateToken(user.id);
    const { password_hash, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me - 解析 JWT 後回傳當前登入用戶資訊
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, nickname, email, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /auth/profile - 修改個人資料（暱稱、密碼）
router.put('/profile', authMiddleware, async (req, res, next) => {
  const { nickname, current_password, new_password } = req.body;

  if (!nickname && !new_password) {
    return res.status(400).json({ error: '請提供要修改的資料' });
  }

  if (nickname !== undefined && nickname.trim() === '') {
    return res.status(400).json({ error: '暱稱不能為空白' });
  }

  try {
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.userId]
    );
    const user = userResult.rows[0];

    let passwordHash = user.password_hash;

    // 若要修改密碼，需先驗證目前密碼
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: '請輸入目前密碼' });
      }
      if (new_password.length < 6) {
        return res.status(400).json({ error: '新密碼至少需要 6 個字元' });
      }
      const isValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: '目前密碼不正確' });
      }
      passwordHash = await bcrypt.hash(new_password, 10);
    }

    const newNickname = nickname !== undefined ? nickname.trim() : user.nickname;

    const updated = await pool.query(
      `UPDATE users SET nickname = $1, password_hash = $2
       WHERE id = $3
       RETURNING id, name, nickname, email, created_at`,
      [newNickname, passwordHash, req.userId]
    );

    res.json({ user: updated.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
