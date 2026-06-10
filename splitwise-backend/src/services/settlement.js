const pool = require('../db/pool');

/**
 * 貪心演算法：計算最優化拆帳結果（Greedy Debt Simplification）
 * 複雜度 O(N log N)，最多產生 N-1 筆轉帳
 *
 * @param {Array} balances - [{userId, name, balance}]
 *   balance > 0：別人欠他（債主）
 *   balance < 0：他欠別人（欠款人）
 * @returns {Array} transactions - [{from, fromName, to, toName, amount}]
 */
function calculateOptimalSettlements(balances) {
  // 過濾餘額為 0 的成員，避免不必要的運算
  const nonZero = balances.filter((b) => b.balance !== 0);

  // 分類為債主（正餘額）與欠款人（負餘額）並各自排序
  const creditors = nonZero
    .filter((b) => b.balance > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance); // 由大到小

  const debtors = nonZero
    .filter((b) => b.balance < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.balance - b.balance); // 負最大的排最前（欠最多）

  const transactions = [];
  let i = 0; // 債主指針
  let j = 0; // 欠款人指針

  // 貪心配對：每次取最大債主與最大欠款人配對，結清較小金額
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    // 本次可結清的金額 = min(債主持有額, 欠款人欠款額)
    const amount = Math.min(creditor.balance, -debtor.balance);

    if (amount > 0) {
      transactions.push({
        from: debtor.userId,
        fromName: debtor.name,
        to: creditor.userId,
        toName: creditor.name,
        amount,
      });
    }

    // 更新雙方餘額
    creditor.balance -= amount;
    debtor.balance += amount;

    // 餘額歸零則移除（移動指針）
    if (creditor.balance === 0) i++;
    if (debtor.balance === 0) j++;
  }

  return transactions;
}

/**
 * 從資料庫計算群組內各成員的當前淨餘額
 * 淨餘額 = (已付費用 - 應付費用) + 已結算收入 - 已結算支出
 * 考慮已完成的 settlements，反映真實待清帳狀態
 *
 * @param {number} groupId
 * @returns {Array} balances - [{userId, name, totalPaid, totalOwed, balance}]
 */
async function calculateBalances(groupId) {
  // 查詢每位成員在此群組的已付總額（透過 expenses 表）
  const paidResult = await pool.query(
    `SELECT u.id AS user_id, COALESCE(u.nickname, u.name) AS name,
            COALESCE(SUM(e.amount), 0)::INTEGER AS total_paid
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     LEFT JOIN expenses e ON e.paid_by = u.id AND e.group_id = $1
     WHERE gm.group_id = $1
     GROUP BY u.id, u.nickname, u.name
     ORDER BY COALESCE(u.nickname, u.name)`,
    [groupId]
  );

  // 查詢每位成員在此群組的應付總額（透過 expense_splits 表）
  const owedResult = await pool.query(
    `SELECT es.user_id,
            COALESCE(SUM(es.amount_owed), 0)::INTEGER AS total_owed
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = $1
     GROUP BY es.user_id`,
    [groupId]
  );

  // 查詢已結算的付出金額（from 方向：減少欠款）
  const settledPaidResult = await pool.query(
    `SELECT from_user_id AS user_id,
            COALESCE(SUM(amount), 0)::INTEGER AS total_settled_paid
     FROM settlements
     WHERE group_id = $1
     GROUP BY from_user_id`,
    [groupId]
  );

  // 查詢已結算的收入金額（to 方向：減少應收）
  const settledReceivedResult = await pool.query(
    `SELECT to_user_id AS user_id,
            COALESCE(SUM(amount), 0)::INTEGER AS total_settled_received
     FROM settlements
     WHERE group_id = $1
     GROUP BY to_user_id`,
    [groupId]
  );

  // 建立快速查找 Map
  const owedMap = {};
  owedResult.rows.forEach((r) => { owedMap[r.user_id] = r.total_owed; });

  const settledPaidMap = {};
  settledPaidResult.rows.forEach((r) => { settledPaidMap[r.user_id] = r.total_settled_paid; });

  const settledReceivedMap = {};
  settledReceivedResult.rows.forEach((r) => { settledReceivedMap[r.user_id] = r.total_settled_received; });

  // 計算每人淨餘額：(已付 - 應付) + 結算付出 - 結算收入
  // 結算付出：表示已還清的欠款，使欠款人餘額增加
  // 結算收入：表示已收到的還款，使債主應收金額減少
  const balances = paidResult.rows.map((r) => {
    const userId = r.user_id;
    const totalPaid = r.total_paid;
    const totalOwed = owedMap[userId] || 0;
    const settledPaid = settledPaidMap[userId] || 0;
    const settledReceived = settledReceivedMap[userId] || 0;

    const balance = (totalPaid - totalOwed) + settledPaid - settledReceived;

    return { userId, name: r.name, totalPaid, totalOwed, balance };
  });

  return balances;
}

module.exports = { calculateBalances, calculateOptimalSettlements };
