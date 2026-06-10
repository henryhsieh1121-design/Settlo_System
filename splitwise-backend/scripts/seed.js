/**
 * Demo seed script — 建立 3 個測試帳號 + 大阪旅遊群組 + 5 筆費用
 * 執行方式: node scripts/seed.js
 *
 * 帳號資訊:
 *   小明  ming@demo.com   / demo1234
 *   阿花  hua@demo.com    / demo1234
 *   大雄  xiong@demo.com  / demo1234
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = require('../src/db/pool');
const bcrypt = require('bcryptjs');

const USERS = [
  { name: '小明', email: 'ming@demo.com' },
  { name: '阿花', email: 'hua@demo.com' },
  { name: '大雄', email: 'xiong@demo.com' },
];

const PASSWORD = 'demo1234';

const EXPENSES = [
  { description: '關西空港快速巴士', amount: 360000, category: '交通', paid_by_idx: 0, date: '2026-06-01' },
  { description: '一蘭拉麵（道頓堀）', amount: 420000, category: '餐飲', paid_by_idx: 1, date: '2026-06-02' },
  { description: '大阪城天守閣門票', amount: 240000, category: '娛樂', paid_by_idx: 2, date: '2026-06-02' },
  { description: 'APA Hotel 兩晚', amount: 1260000, category: '住宿', paid_by_idx: 0, date: '2026-06-03' },
  { description: '黑門市場伴手禮', amount: 315000, category: '購物', paid_by_idx: 1, date: '2026-06-04' },
];

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash(PASSWORD, 10);
    const userIds = [];

    for (const u of USERS) {
      const existing = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [u.email]
      );
      if (existing.rows.length > 0) {
        userIds.push(existing.rows[0].id);
        console.log(`  已存在: ${u.name} (${u.email})`);
      } else {
        const res = await client.query(
          'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
          [u.name, u.email, hash]
        );
        userIds.push(res.rows[0].id);
        console.log(`  建立: ${u.name} (${u.email})`);
      }
    }

    // 建立群組（以小明為建立者）
    const existingGroup = await client.query(
      'SELECT id FROM groups WHERE name = $1 AND created_by = $2',
      ['大阪旅遊', userIds[0]]
    );

    let groupId;
    if (existingGroup.rows.length > 0) {
      groupId = existingGroup.rows[0].id;
      console.log(`\n  群組已存在 (id=${groupId})`);
    } else {
      const gRes = await client.query(
        `INSERT INTO groups (name, description, created_by)
         VALUES ($1, $2, $3) RETURNING id`,
        ['大阪旅遊', '2026 年 6 月大阪 4 天 3 夜', userIds[0]]
      );
      groupId = gRes.rows[0].id;
      console.log(`\n  建立群組「大阪旅遊」(id=${groupId})`);

      for (const uid of userIds) {
        await client.query(
          'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [groupId, uid]
        );
      }
    }

    // 建立費用
    const existingExpenses = await client.query(
      'SELECT COUNT(*)::INTEGER AS cnt FROM expenses WHERE group_id = $1',
      [groupId]
    );
    if (existingExpenses.rows[0].cnt > 0) {
      console.log(`\n  費用已存在，跳過建立`);
    } else {
      const n = userIds.length;
      for (const e of EXPENSES) {
        const paidBy = userIds[e.paid_by_idx];
        const expRes = await client.query(
          `INSERT INTO expenses (group_id, paid_by, amount, description, category, date)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [groupId, paidBy, e.amount, e.description, e.category, e.date]
        );
        const expId = expRes.rows[0].id;

        const base = Math.floor(e.amount / n);
        const rem = e.amount % n;
        for (let i = 0; i < n; i++) {
          const owed = userIds[i] === paidBy ? base + rem : base;
          await client.query(
            'INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES ($1, $2, $3)',
            [expId, userIds[i], owed]
          );
        }
        console.log(`  費用: ${e.description} — NT$${(e.amount / 100).toFixed(0)} (付款人: ${USERS[e.paid_by_idx].name})`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed 完成！');
    console.log('\n帳號資訊（密碼均為 demo1234）:');
    USERS.forEach((u) => console.log(`  ${u.name}: ${u.email}`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed 失敗:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
