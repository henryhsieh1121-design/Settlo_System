import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../store/useAuthStore';
import useGroupStore from '../store/useGroupStore';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import DonutChart from '../components/DonutChart';
import AddExpenseModal from '../components/AddExpenseModal';
import AddMemberModal from '../components/AddMemberModal';
import { Card, Button, Stat, Empty, Icon } from '../components/ui/index';
import { formatCurrency } from '../utils/formatCurrency';
import { CATEGORY_LIST, getCategoryByValue } from '../utils/categories';
import { enrichMember, getGroupCover, getGroupEmoji } from '../utils/avatars';

// 格式化日期為中文
function fmtDate(d) {
  const date = new Date(d + 'T00:00:00');
  const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${days[date.getDay()]}`;
}

// FilterChip 元件
function FilterChip({ active, onClick, children, color, icon }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-pill text-sm font-semibold whitespace-nowrap border transition-all"
      style={active
        ? { background: color || 'var(--primary-grad)', borderColor: color || 'var(--primary)', color: '#fff' }
        : { borderColor: 'var(--border)', color: 'var(--muted)', background: 'transparent' }}
      onMouseOver={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseOut={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {icon && <Icon name={icon} size={13} strokeWidth={2.4} />}
      {children}
    </button>
  );
}

// 費用列
function ExpenseRow({ expense, members, currentUserId, onDelete, onEdit, idx }) {
  const payer = members.find((m) => m.id === expense.paid_by_id) || { name: expense.paid_by_name, id: expense.paid_by_id };
  const catInfo = getCategoryByValue(expense.category || '其他');
  const myShare = expense.splits?.find((s) => s.userId === currentUserId);
  const isYou = payer.id === currentUserId;

  return (
    <div
      className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 transition-colors anim-fade"
      style={{ animationDelay: idx * 30 + 'ms' }}
      onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseOut={(e) => { e.currentTarget.style.background = ''; }}
    >
      {/* 類別圖示 */}
      <span
        className="grid place-items-center w-10 h-10 rounded-xl shrink-0"
        style={{ background: catInfo.color + '20', color: catInfo.color }}
      >
        <Icon name={catInfo.icon} size={18} strokeWidth={2.2} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm truncate">{expense.description}</div>
        <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          <Avatar member={enrichMember(payer, currentUserId)} size={16} />
          <span>{isYou ? '你' : payer.name} 付款</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="tnum font-bold text-sm">{formatCurrency(expense.amount)}</div>
        {myShare && (
          <div className="tnum text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            你 {formatCurrency(myShare.amountOwed)}
          </div>
        )}
      </div>

      {/* 編輯與刪除按鈕（只有付款人可見） */}
      {expense.paid_by_id === currentUserId && (
        <>
          <button
            onClick={() => onEdit(expense)}
            className="grid place-items-center w-7 h-7 rounded-full transition-colors shrink-0"
            style={{ color: 'var(--muted)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary)20'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--muted)'; }}
            title="編輯此費用"
          >
            <Icon name="Pencil" size={14} />
          </button>
          <button
            onClick={() => onDelete(expense.id)}
            className="grid place-items-center w-7 h-7 rounded-full transition-colors shrink-0"
            style={{ color: 'var(--muted)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--negative)20'; e.currentTarget.style.color = 'var(--negative)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--muted)'; }}
            title="刪除此費用"
          >
            <Icon name="Trash2" size={14} />
          </button>
        </>
      )}
    </div>
  );
}

function getDateRange(preset) {
  const now = new Date();
  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // 從本週日開始
    return [start.toISOString().slice(0, 10), now.toISOString().slice(0, 10)];
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [start.toISOString().slice(0, 10), now.toISOString().slice(0, 10)];
  }
  return [null, null];
}

export default function GroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { setCurrentGroup, removeGroup } = useGroupStore();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'week' | 'month'

  const loadData = useCallback(async () => {
    try {
      const [groupRes, expensesRes, balanceRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/balance`),
      ]);
      setGroup(groupRes.data.group);
      setMembers(groupRes.data.members);
      setExpenses(expensesRes.data.expenses);
      setBalances(balanceRes.data.balances || []);
      setCurrentGroup(groupRes.data.group, groupRes.data.members);
    } catch (err) {
      toast.error('載入群組資料失敗');
      if (err.response?.status === 403) navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, setCurrentGroup]);

  useEffect(() => { loadData(); }, [loadData]);

  // 從 SettlePage 返回時帶有 refresh flag，立即重新載入並清除 state
  useEffect(() => {
    if (location.state?.refresh) {
      loadData();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, loadData]);

  const handleExpenseDeleted = async (expenseId) => {
    try {
      await api.delete(`/expenses/${expenseId}`);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      toast.success('費用已刪除');
      // 重新取得餘額
      const { data } = await api.get(`/groups/${id}/balance`);
      setBalances(data.balances || []);
    } catch {
      toast.error('刪除失敗');
    }
  };

  const handleExpenseAdded = () => { loadData(); };

  const handleExpenseEdited = () => { setEditingExpense(null); loadData(); };

  const handleMemberAdded = () => { loadData(); };

  const handleLeaveGroup = async () => {
    if (!window.confirm(`確定要退出「${group?.name}」嗎？`)) return;
    try {
      await api.delete(`/groups/${id}/leave`);
      removeGroup(parseInt(id));
      navigate('/dashboard');
    } catch {
      toast.error('退出群組失敗');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm(`確定要刪除「${group?.name}」嗎？\n此操作將永久刪除所有費用與結算紀錄，無法復原。`)) return;
    try {
      await api.delete(`/groups/${id}`);
      removeGroup(parseInt(id));
      navigate('/dashboard');
      toast.success('群組已刪除');
    } catch {
      toast.error('刪除群組失敗');
    }
  };

  // 計算統計數據
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const myTotalPaid = expenses.filter((e) => e.paid_by_id === user?.id).reduce((s, e) => s + e.amount, 0);
  const myBalance = balances.find((b) => b.userId === user?.id);

  // CSV 匯出（目前篩選結果）
  const exportCSV = () => {
    const rows = [['日期', '費用項目', '類別', '金額(元)', '付款人']];
    [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach((e) => {
      const payer = members.find((m) => m.id === e.paid_by_id) || { name: e.paid_by_name };
      rows.push([
        (e.date || '').slice(0, 10),
        e.description,
        getCategoryByValue(e.category).label,
        (e.amount / 100).toFixed(0),
        payer.name,
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${group?.name || 'expenses'}_費用.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 費用篩選
  const usedCats = [...new Set(expenses.map((e) => getCategoryByValue(e.category).id))];
  const [dateFrom, dateTo] = getDateRange(dateFilter);
  const filtered = expenses.filter((e) => {
    const catId = getCategoryByValue(e.category).id;
    const d = (e.date || '').slice(0, 10);
    return (filter === 'all' || catId === filter) &&
      (!query || e.description?.toLowerCase().includes(query.toLowerCase())) &&
      (!dateFrom || d >= dateFrom) &&
      (!dateTo || d <= dateTo);
  });

  // 依日期分組
  const byDate = {};
  [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach((e) => {
    const d = (e.date || '').slice(0, 10);
    (byDate[d] = byDate[d] || []).push(e);
  });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  // Donut chart 資料（付款比例）
  const payerMap = {};
  expenses.forEach((e) => {
    payerMap[e.paid_by_id] = (payerMap[e.paid_by_id] || 0) + e.amount;
  });
  const donutData = Object.entries(payerMap).map(([uid, value]) => {
    const m = members.find((m) => m.userId === parseInt(uid) || m.id === parseInt(uid));
    const enriched = m ? enrichMember(m, user?.id) : { id: parseInt(uid), name: `用戶${uid}`, color: '#888', you: false };
    return {
      label: enriched.you ? '你' : enriched.name,
      value,
      color: enriched.color,
      sub: formatCurrency(value),
    };
  });

  const enrichedMembers = members.map((m) => enrichMember(m, user?.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-sm" style={{ color: 'var(--muted)' }}>載入中…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 anim-fade">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <Icon name="ChevronLeft" size={16} /> 我的群組
        </button>

        {/* 群組標題列 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="grid place-items-center w-14 h-14 rounded-2xl text-3xl shrink-0"
              style={{ background: getGroupCover(group?.id) }}
            >
              {getGroupEmoji(group?.id)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">{group?.name}</h1>
              <div className="flex items-center gap-2 text-sm mt-1" style={{ color: 'var(--muted)' }}>
                <div className="flex -space-x-1.5">
                  {enrichedMembers.map((m) => <Avatar key={m.id} member={m} size={20} ring />)}
                </div>
                <span className="whitespace-nowrap">{enrichedMembers.length} 位成員</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {user?.id === group?.created_by ? (
              <Button variant="ghost" icon="Trash2" onClick={handleDeleteGroup} style={{ color: 'var(--negative)' }}>
                <span className="hidden sm:inline">刪除群組</span>
              </Button>
            ) : (
              <Button variant="ghost" icon="LogOut" onClick={handleLeaveGroup}>
                <span className="hidden sm:inline">退出群組</span>
              </Button>
            )}
            <Button variant="outline" icon="UserPlus" onClick={() => setShowAddMember(true)}>
              <span className="hidden sm:inline">加入成員</span>
            </Button>
            <Button variant="outline" icon="Wallet" onClick={() => navigate(`/groups/${id}/settle`)}>
              <span className="hidden sm:inline">結算</span>
            </Button>
            <Button icon="Plus" onClick={() => setShowAddExpense(true)}>
              <span className="hidden sm:inline">新增費用</span>
            </Button>
          </div>
        </div>

        {expenses.length === 0 ? (
          <Card className="py-4">
            <Empty
              icon="ReceiptText"
              title="這個群組還沒有費用"
              desc="新增第一筆費用，系統會自動幫大家均分並算出最少轉帳的結算方式。"
              action={<Button icon="Plus" size="lg" onClick={() => setShowAddExpense(true)}>新增第一筆費用</Button>}
            />
          </Card>
        ) : (
          <>
            {/* 統計卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <Stat label="總費用" value={formatCurrency(totalExpenses)} sub={`${expenses.length} 筆支出`} icon="Receipt" tone="primary" />
              <Stat label="我已付" value={formatCurrency(myTotalPaid)} sub="我先墊的款" icon="Wallet" />
              <Stat
                label="我尚欠"
                value={formatCurrency(Math.max(-(myBalance?.balance ?? 0), 0))}
                sub={(myBalance?.balance ?? 0) < 0 ? '待結算付出' : '目前無欠款'}
                icon="ArrowUpRight"
                tone={(myBalance?.balance ?? 0) < 0 ? 'negative' : 'default'}
              />
              <Stat
                label="別人欠我"
                value={formatCurrency(Math.max(myBalance?.balance ?? 0, 0))}
                sub={(myBalance?.balance ?? 0) > 0 ? '待收回' : '目前無人欠款'}
                icon="ArrowDownLeft"
                tone={(myBalance?.balance ?? 0) > 0 ? 'positive' : 'default'}
              />
            </div>

            <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5 sm:gap-6">
              {/* 費用清單 */}
              <div className="order-1">
                <Card className="overflow-hidden">
                  <div className="p-4 sm:p-5 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h2 className="font-bold">費用清單</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{filtered.length}/{expenses.length} 筆</span>
                        <button
                          onClick={exportCSV}
                          className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-semibold border transition-colors"
                          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--muted)'; }}
                          title="匯出目前篩選結果為 CSV"
                        >
                          <Icon name="Download" size={12} /> CSV
                        </button>
                      </div>
                    </div>

                    {/* 搜尋列 */}
                    <div className="relative mb-3">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }}>
                        <Icon name="Search" size={16} />
                      </span>
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="搜尋費用…"
                        className="w-full h-10 pl-9 pr-3 rounded-xl text-sm focus:outline-none border"
                        style={{
                          background: 'var(--surface-2)',
                          borderColor: 'var(--border)',
                          color: 'var(--text)',
                        }}
                        onFocus={(e) => { e.target.style.background = 'var(--surface)'; }}
                        onBlur={(e) => { e.target.style.background = 'var(--surface-2)'; }}
                      />
                    </div>

                    {/* 日期快篩 */}
                    <div className="no-scrollbar flex gap-1.5 overflow-x-auto mb-2">
                      {[
                        { key: 'all', label: '所有時間' },
                        { key: 'month', label: '本月' },
                        { key: 'week', label: '本週' },
                      ].map(({ key, label }) => (
                        <FilterChip key={key} active={dateFilter === key} onClick={() => setDateFilter(key)}>
                          {label}
                        </FilterChip>
                      ))}
                    </div>

                    {/* 類別篩選 */}
                    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 -mb-1">
                      <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>全部類別</FilterChip>
                      {CATEGORY_LIST.filter((c) => usedCats.includes(c.id)).map((c) => (
                        <FilterChip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)} color={c.color} icon={c.icon}>
                          {c.label}
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  {dates.length === 0 ? (
                    <div className="py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>
                      <Icon name="SearchX" size={28} className="mx-auto mb-2 opacity-50" />
                      找不到符合的費用
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {dates.map((d) => (
                        <div key={d}>
                          <div
                            className="px-4 sm:px-5 py-2 text-xs font-semibold sticky top-16"
                            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
                          >
                            {fmtDate(d)}
                          </div>
                          {byDate[d].map((e, i) => (
                            <ExpenseRow
                              key={e.id}
                              expense={e}
                              members={members}
                              currentUserId={user?.id}
                              onDelete={handleExpenseDeleted}
                              onEdit={setEditingExpense}
                              idx={i}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* 側邊欄：Donut + 成員餘額 */}
              <div className="order-2 space-y-5 sm:space-y-6">
                {donutData.length > 0 && (
                  <Card className="p-5">
                    <h2 className="font-bold mb-1">各人付款比例</h2>
                    <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>誰先墊了多少款項</p>
                    <DonutChart
                      data={donutData}
                      centerLabel="總支出"
                      centerValue={formatCurrency(totalExpenses)}
                    />
                  </Card>
                )}

                <Card className="p-5">
                  <h2 className="font-bold mb-3">成員餘額</h2>
                  <div className="space-y-1">
                    {balances.map((b) => {
                      const enriched = enrichMember(
                        members.find((m) => (m.userId || m.id) === b.userId) || { userId: b.userId, name: b.name },
                        user?.id
                      );
                      return (
                        <div key={b.userId} className="flex items-center gap-3 py-2">
                          <Avatar member={enriched} size={32} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">{enriched.you ? '你' : enriched.name}</div>
                            <div className="tnum text-xs" style={{ color: 'var(--muted)' }}>
                              已付 {formatCurrency(b.totalPaid || 0)}
                            </div>
                          </div>
                          <div
                            className="tnum text-sm font-bold"
                            style={{
                              color: Math.abs(b.balance) < 1 ? 'var(--muted)'
                                : b.balance > 0 ? 'var(--positive)' : 'var(--negative)',
                            }}
                          >
                            {Math.abs(b.balance) < 1 ? '已結清' : (b.balance > 0 ? '+' : '') + formatCurrency(b.balance)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    variant="soft"
                    className="w-full mt-3"
                    icon="Wallet"
                    onClick={() => navigate(`/groups/${id}/settle`)}
                  >
                    查看結算建議
                  </Button>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>

      <AddExpenseModal
        open={showAddExpense || !!editingExpense}
        groupId={parseInt(id)}
        members={members}
        currentUserId={user?.id}
        editExpense={editingExpense}
        onClose={() => { setShowAddExpense(false); setEditingExpense(null); }}
        onAdded={editingExpense ? handleExpenseEdited : handleExpenseAdded}
      />

      <AddMemberModal
        open={showAddMember}
        groupId={parseInt(id)}
        onClose={() => setShowAddMember(false)}
        onAdded={handleMemberAdded}
      />
    </div>
  );
}
