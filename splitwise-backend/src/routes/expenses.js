const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// PUT /expenses/:id - 編輯費用（僅限 paid_by 本人）
// Transaction：先刪舊分攤明細，再依新資料重新計算並插入，最後更新主記錄
router.put('/:id', authMiddleware, async (req, res, next) => {
  const expenseId = parseInt(req.params.id);
  const { description, amount, category, date, split_type, custom_splits } = req.body;

  if (!description || !amount) {
    return res.status(400).json({ error: '費用名稱和金額為必填' });
  }
  const amountInt = parseInt(amount);
  if (isNaN(amountInt) || amountInt <= 0) {
    return res.status(400).json({ error: '金額必須為正整數（以分為單位）' });
  }

  const client = await pool.connect();
  try {
    const expenseResult = await client.query(
      'SELECT * FROM expenses WHERE id = $1',
      [expenseId]
    );
    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ error: '費用不存在' });
    }
    const expense = expenseResult.rows[0];
    if (expense.paid_by !== req.userId) {
      return res.status(403).json({ error: '只有付款人才能編輯此費用' });
    }

    // 取得群組成員清單（用於均分計算）
    const membersResult = await client.query(
      'SELECT user_id FROM group_members WHERE group_id = $1',
      [expense.group_id]
    );
    const memberIds = membersResult.rows.map((r) => r.user_id);

    let splits = [];
    if (split_type === 'custom' && Array.isArray(custom_splits)) {
      const totalCustom = custom_splits.reduce((s, c) => s + parseInt(c.amount_owed), 0);
      if (totalCustom !== amountInt) {
        return res.status(400).json({ error: `自訂分攤加總（${totalCustom}）不等於總費用（${amountInt}）` });
      }
      splits = custom_splits.map((c) => ({ userId: parseInt(c.user_id), amountOwed: parseInt(c.amount_owed) }));
    } else {
      const n = memberIds.length;
      const base = Math.floor(amountInt / n);
      const rem = amountInt % n;
      splits = memberIds.map((uid) => ({
        userId: uid,
        amountOwed: uid === expense.paid_by ? base + rem : base,
      }));
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM expense_splits WHERE expense_id = $1', [expenseId]);
    for (const s of splits) {
      await client.query(
        'INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES ($1, $2, $3)',
        [expenseId, s.userId, s.amountOwed]
      );
    }
    const updated = await client.query(
      `UPDATE expenses SET description=$1, amount=$2, category=$3, date=$4 WHERE id=$5 RETURNING *`,
      [description.trim(), amountInt, category || '其他', date || expense.date, expenseId]
    );
    await client.query('COMMIT');

    res.json({ expense: updated.rows[0], splits });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /expenses/:id - 刪除費用（僅限 paid_by 本人）
// 使用 Transaction 確保 expense_splits 與 expenses 一致性
router.delete('/:id', authMiddleware, async (req, res, next) => {
  const expenseId = parseInt(req.params.id);

  const client = await pool.connect();
  try {
    const expenseResult = await client.query(
      'SELECT * FROM expenses WHERE id = $1',
      [expenseId]
    );

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ error: '費用不存在' });
    }

    const expense = expenseResult.rows[0];

    // 僅 paid_by 本人可刪除
    if (expense.paid_by !== req.userId) {
      return res.status(403).json({ error: '只有付款人才能刪除此費用' });
    }

    await client.query('BEGIN');

    // 先刪除分攤明細，再刪除費用（雖有 CASCADE 但明確刪除更可靠）
    await client.query('DELETE FROM expense_splits WHERE expense_id = $1', [expenseId]);
    await client.query('DELETE FROM expenses WHERE id = $1', [expenseId]);

    await client.query('COMMIT');
    res.json({ message: '費用已刪除', expenseId });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
