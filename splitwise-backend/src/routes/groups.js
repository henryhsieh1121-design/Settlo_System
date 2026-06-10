const express = require('express');
const { randomBytes } = require('crypto');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');
const { calculateBalances, calculateOptimalSettlements } = require('../services/settlement');

// 產生 6 碼不易混淆的英數邀請碼
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

const router = express.Router();

// 確認當前用戶是否為群組成員的輔助函式
async function assertGroupMember(client, groupId, userId) {
  const result = await client.query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  if (result.rows.length === 0) {
    const err = new Error('無權限存取此群組');
    err.status = 403;
    throw err;
  }
}

// GET /groups - 取得當前用戶加入的所有群組
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.description, g.created_by, g.created_at,
              COUNT(gm2.user_id)::INTEGER AS member_count
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       JOIN group_members gm2 ON gm2.group_id = g.id
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [req.userId]
    );
    res.json({ groups: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /groups - 建立新群組，自動將建立者加入 group_members
router.post('/', authMiddleware, async (req, res, next) => {
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: '群組名稱為必填' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const groupResult = await client.query(
      `INSERT INTO groups (name, description, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), description || null, req.userId]
    );
    const group = groupResult.rows[0];

    // 建立者自動成為第一位成員
    await client.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [group.id, req.userId]
    );

    await client.query('COMMIT');
    res.status(201).json({ group });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /groups/:id - 取得群組詳情與成員列表
router.get('/:id', authMiddleware, async (req, res, next) => {
  const groupId = parseInt(req.params.id);

  try {
    const groupResult = await pool.query(
      'SELECT * FROM groups WHERE id = $1',
      [groupId]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: '群組不存在' });
    }

    await assertGroupMember(pool, groupId, req.userId);

    const membersResult = await pool.query(
      `SELECT u.id, COALESCE(u.nickname, u.name) AS name, u.email, gm.joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    res.json({ group: groupResult.rows[0], members: membersResult.rows });
  } catch (err) {
    next(err);
  }
});

// POST /groups/join - 透過邀請碼加入群組（需放在 /:id 路由之前）
router.post('/join', authMiddleware, async (req, res, next) => {
  const { invite_code } = req.body;

  if (!invite_code || invite_code.trim() === '') {
    return res.status(400).json({ error: '邀請碼為必填' });
  }

  try {
    const groupResult = await pool.query(
      'SELECT id, name FROM groups WHERE invite_code = $1',
      [invite_code.trim().toUpperCase()]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: '邀請碼無效或已失效' });
    }

    const group = groupResult.rows[0];

    const existing = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group.id, req.userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '你已經在這個群組中了', groupId: group.id });
    }

    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [group.id, req.userId]
    );

    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
});

// DELETE /groups/:id - 刪除整個群組（僅限建立者）
router.delete('/:id', authMiddleware, async (req, res, next) => {
  const groupId = parseInt(req.params.id);

  try {
    const result = await pool.query('SELECT created_by FROM groups WHERE id = $1', [groupId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '群組不存在' });
    }
    if (result.rows[0].created_by !== req.userId) {
      return res.status(403).json({ error: '只有建立者才能刪除群組' });
    }

    // CASCADE 會一併清除 group_members、expenses、expense_splits、settlements
    await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);
    res.json({ message: '群組已刪除' });
  } catch (err) {
    next(err);
  }
});

// DELETE /groups/:id/leave - 退出群組；若為最後一位成員則同時刪除群組
router.delete('/:id/leave', authMiddleware, async (req, res, next) => {
  const groupId = parseInt(req.params.id);

  const client = await pool.connect();
  try {
    await assertGroupMember(client, groupId, req.userId);

    const countResult = await client.query(
      'SELECT COUNT(*)::INTEGER AS cnt FROM group_members WHERE group_id = $1',
      [groupId]
    );
    const memberCount = countResult.rows[0].cnt;

    await client.query('BEGIN');

    if (memberCount === 1) {
      // 最後一位成員，連同群組一起刪除（expenses/settlements 由 CASCADE 清除）
      await client.query('DELETE FROM groups WHERE id = $1', [groupId]);
    } else {
      await client.query(
        'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, req.userId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: '已退出群組', deleted: memberCount === 1 });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /groups/:id/invite - 產生或重新產生邀請碼（需為群組成員）
router.post('/:id/invite', authMiddleware, async (req, res, next) => {
  const groupId = parseInt(req.params.id);

  try {
    await assertGroupMember(pool, groupId, req.userId);

    // 碰撞重試最多 5 次（實務上幾乎不會碰撞）
    let code, retries = 0;
    while (retries < 5) {
      code = generateInviteCode();
      const conflict = await pool.query(
        'SELECT 1 FROM groups WHERE invite_code = $1 AND id != $2',
        [code, groupId]
      );
      if (conflict.rows.length === 0) break;
      retries++;
    }

    const result = await pool.query(
      'UPDATE groups SET invite_code = $1 WHERE id = $2 RETURNING invite_code',
      [code, groupId]
    );

    res.json({ invite_code: result.rows[0].invite_code });
  } catch (err) {
    next(err);
  }
});

// POST /groups/:id/members - 透過 email 搜尋用戶後加入群組
router.post('/:id/members', authMiddleware, async (req, res, next) => {
  const groupId = parseInt(req.params.id);
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email 為必填' });
  }

  try {
    await assertGroupMember(pool, groupId, req.userId);

    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '找不到此 Email 的用戶' });
    }

    const targetUser = userResult.rows[0];

    const existingMember = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUser.id]
    );
    if (existingMember.rows.length > 0) {
      return res.status(409).json({ error: '此用戶已在群組中' });
    }

    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [groupId, targetUser.id]
    );

    res.status(201).json({ member: targetUser });
  } catch (err) {
    next(err);
  }
});

// GET /groups/:id/balance - 計算各成員淨餘額並回傳最優化轉帳清單
router.get('/:id/balance', authMiddleware, async (req, res, next) => {
  const groupId = parseInt(req.params.id);

  try {
    await assertGroupMember(pool, groupId, req.userId);

    const balances = await calculateBalances(groupId);
    const suggestedTransfers = calculateOptimalSettlements(balances);

    res.json({ balances, suggestedTransfers });
  } catch (err) {
    next(err);
  }
});

// GET /groups/:id/expenses - 取得群組費用，支援 ?from=YYYY-MM-DD&to=YYYY-MM-DD 日期篩選
router.get('/:id/expenses', authMiddleware, async (req, res, next) => {
  const groupId = parseInt(req.params.id);
  const { from, to } = req.query;

  try {
    await assertGroupMember(pool, groupId, req.userId);

    const params = [groupId];
    const conditions = ['e.group_id = $1'];
    if (from) { conditions.push(`e.date >= $${params.push(from)}`); }
    if (to)   { conditions.push(`e.date <= $${params.push(to)}`);   }

    const result = await pool.query(
      `SELECT e.id, e.amount, e.description, e.category, e.date, e.created_at,
              e.paid_by AS paid_by_id, COALESCE(u.nickname, u.name) AS paid_by_name,
              json_agg(
                json_build_object(
                  'userId', es.user_id,
                  'name', COALESCE(su.nickname, su.name),
                  'amountOwed', es.amount_owed
                ) ORDER BY COALESCE(su.nickname, su.name)
              ) AS splits
       FROM expenses e
       JOIN users u ON u.id = e.paid_by
       JOIN expense_splits es ON es.expense_id = e.id
       JOIN users su ON su.id = es.user_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY e.id, u.id, u.name
       ORDER BY e.date DESC, e.created_at DESC`,
      params
    );

    res.json({ expenses: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /groups/:id/expenses - 新增費用（支援均分或自訂金額）
router.post('/:id/expenses', authMiddleware, async (req, res, next) => {
  const groupId = parseInt(req.params.id);
  const { description, amount, paid_by, category, date, split_type, custom_splits } = req.body;

  if (!description || !amount || !paid_by) {
    return res.status(400).json({ error: '描述、金額和付款人均為必填' });
  }

  const amountInt = parseInt(amount);
  if (isNaN(amountInt) || amountInt <= 0) {
    return res.status(400).json({ error: '金額必須為正整數（以分為單位）' });
  }

  const client = await pool.connect();
  try {
    // 查詢群組成員清單
    const memberCheck = await client.query(
      'SELECT user_id FROM group_members WHERE group_id = $1',
      [groupId]
    );
    const memberIds = memberCheck.rows.map((r) => r.user_id);

    if (!memberIds.includes(req.userId)) {
      return res.status(403).json({ error: '無權限存取此群組' });
    }
    if (!memberIds.includes(parseInt(paid_by))) {
      return res.status(400).json({ error: '付款人必須是群組成員' });
    }

    await client.query('BEGIN');

    const expenseResult = await client.query(
      `INSERT INTO expenses (group_id, paid_by, amount, description, category, date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        groupId,
        parseInt(paid_by),
        amountInt,
        description.trim(),
        category || '其他',
        date || new Date().toISOString().split('T')[0],
      ]
    );
    const expense = expenseResult.rows[0];

    let splits = [];

    if (split_type === 'custom' && Array.isArray(custom_splits)) {
      // 自訂金額：後端驗證加總是否等於總費用
      const totalCustom = custom_splits.reduce((sum, s) => sum + parseInt(s.amount_owed), 0);
      if (totalCustom !== amountInt) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `自訂分攤金額加總（${totalCustom}）不等於總費用（${amountInt}）`,
        });
      }
      splits = custom_splits.map((s) => ({
        userId: parseInt(s.user_id),
        amountOwed: parseInt(s.amount_owed),
      }));
    } else {
      // 均分模式：餘數由 paid_by 自行吸收（最常見做法）
      const n = memberIds.length;
      const baseAmount = Math.floor(amountInt / n);
      const remainder = amountInt % n;

      splits = memberIds.map((uid) => ({
        userId: uid,
        amountOwed: uid === parseInt(paid_by) ? baseAmount + remainder : baseAmount,
      }));
    }

    // 批次插入費用分攤明細
    for (const split of splits) {
      await client.query(
        'INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES ($1, $2, $3)',
        [expense.id, split.userId, split.amountOwed]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ expense, splits });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /groups/:id/settlements - 取得群組歷史結算紀錄
router.get('/:id/settlements', authMiddleware, async (req, res, next) => {
  const groupId = parseInt(req.params.id);

  try {
    await assertGroupMember(pool, groupId, req.userId);

    const result = await pool.query(
      `SELECT s.id, s.amount, s.settled_at,
              fu.id AS from_user_id, COALESCE(fu.nickname, fu.name) AS from_user_name,
              tu.id AS to_user_id, COALESCE(tu.nickname, tu.name) AS to_user_name
       FROM settlements s
       JOIN users fu ON fu.id = s.from_user_id
       JOIN users tu ON tu.id = s.to_user_id
       WHERE s.group_id = $1
       ORDER BY s.settled_at DESC`,
      [groupId]
    );

    res.json({ settlements: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /groups/:id/settle - 標記某筆轉帳為已完成，寫入 settlements 表
router.post('/:id/settle', authMiddleware, async (req, res, next) => {
  const groupId = parseInt(req.params.id);
  const { from_user_id, to_user_id, amount } = req.body;

  if (!from_user_id || !to_user_id || !amount) {
    return res.status(400).json({ error: 'from_user_id、to_user_id 和 amount 均為必填' });
  }
  if (parseInt(amount) <= 0) {
    return res.status(400).json({ error: '金額必須大於 0' });
  }

  try {
    await assertGroupMember(pool, groupId, req.userId);

    const result = await pool.query(
      `INSERT INTO settlements (group_id, from_user_id, to_user_id, amount)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [groupId, parseInt(from_user_id), parseInt(to_user_id), parseInt(amount)]
    );

    res.status(201).json({ settlement: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
