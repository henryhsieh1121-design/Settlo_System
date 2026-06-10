import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../store/useAuthStore';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import { Card, Button, Empty, Icon } from '../components/ui/index';
import { formatCurrency } from '../utils/formatCurrency';
import { enrichMember } from '../utils/avatars';

// BalanceCard — 左側彩色邊條
function BalanceCard({ balance, isYou, idx }) {
  const v = balance.balance;
  const settled = Math.abs(v) < 1;
  const pos = v > 0;
  const tone = settled ? 'var(--muted)' : pos ? 'var(--positive)' : 'var(--negative)';
  const bg = settled ? 'var(--surface-2)' : pos ? 'var(--positive)' : 'var(--negative)';
  const label = settled ? '已結清' : pos ? '別人欠我' : '我欠別人';

  return (
    <Card
      className="p-4 relative overflow-hidden anim-slide"
      style={{ animationDelay: idx * 60 + 'ms' }}
    >
      {/* 左側邊條 */}
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: bg }} />

      <div className="flex items-center gap-3 mb-3">
        <Avatar member={balance} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate">
            {isYou ? '你' : balance.name}
          </div>
          <div className="text-xs" style={{ color: tone }}>{label}</div>
        </div>
        {settled && <Icon name="CheckCircle2" size={18} style={{ color: 'var(--positive)' }} />}
      </div>
      <div
        className="tnum text-xl font-extrabold"
        style={{ color: tone, animation: 'count-flash .6s ease-out' }}
      >
        {settled ? 'NT$0' : formatCurrency(Math.abs(v))}
      </div>
    </Card>
  );
}

// TransferRow — 帶 collapse-out 動畫
function TransferRow({ transfer, onPaid, removing }) {
  return (
    <div
      className={'flex items-center gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl ' + (removing ? 'collapsing' : 'anim-pop')}
      style={{ background: 'var(--surface-2)' }}
    >
      <Avatar member={transfer.fromEnriched} size={32} />
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
        <span className="text-sm font-bold truncate">
          {transfer.fromEnriched.you ? '你' : transfer.fromName}
        </span>
        <span
          className="grid place-items-center w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0"
          style={{ background: 'var(--primary-weak)', color: 'var(--primary)' }}
        >
          <Icon name="ArrowRight" size={12} strokeWidth={2.5} />
        </span>
        <Avatar member={transfer.toEnriched} size={20} />
        <span className="text-sm font-bold truncate">
          {transfer.toEnriched.you ? '你' : transfer.toName}
        </span>
      </div>
      <span className="tnum font-extrabold text-sm shrink-0" style={{ color: 'var(--primary)' }}>
        {formatCurrency(transfer.amount)}
      </span>
      <Button size="sm" variant="positive" icon="Check" onClick={() => onPaid(transfer)} className="shrink-0">
        <span className="hidden sm:inline">標記已付</span>
      </Button>
    </div>
  );
}

export default function SettlePage() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [groupName, setGroupName] = useState('');
  const [balances, setBalances] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [groupRes, balanceRes, settlementsRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/groups/${groupId}/balance`),
        api.get(`/groups/${groupId}/settlements`),
      ]);
      setGroupName(groupRes.data.group.name);
      setBalances(balanceRes.data.balances || []);
      setTransfers(balanceRes.data.suggestedTransfers || []);
      setSettlements(settlementsRes.data.settlements || []);
    } catch (err) {
      toast.error('載入結算資料失敗');
      if (err.response?.status === 403) navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [groupId, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkPaid = async (transfer) => {
    const key = `${transfer.from}-${transfer.to}`;
    setRemovingId(key);
    try {
      await api.post(`/groups/${groupId}/settle`, {
        from_user_id: transfer.from,
        to_user_id: transfer.to,
        amount: transfer.amount,
      });
      toast.success('已標記結算！');
      setTimeout(async () => {
        setRemovingId(null);
        await loadData();
        // 通知 GroupPage 在返回時刷新餘額
        window.history.replaceState({ refresh: true }, '');
      }, 400);
    } catch (err) {
      setRemovingId(null);
      toast.error(err.response?.data?.error || '標記失敗');
    }
  };

  const totalToSettle = transfers.reduce((s, t) => s + t.amount, 0);
  const allClear = transfers.length === 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-sm" style={{ color: 'var(--muted)' }}>計算中…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 anim-fade">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/groups/${groupId}`, { state: { refresh: true } })}
          className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <Icon name="ChevronLeft" size={16} /> {groupName}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              結算 · {groupName}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              用最少的轉帳次數，把帳一次清乾淨。
            </p>
          </div>
        </div>

        {/* 每人餘額 */}
        <h2 className="font-bold mb-3">每人餘額</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {balances.map((b, i) => (
            <BalanceCard
              key={b.userId}
              balance={{ ...enrichMember({ ...b, userId: b.userId, id: b.userId }, user?.id), balance: b.balance }}
              isYou={b.userId === user?.id}
              idx={i}
            />
          ))}
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 sm:gap-6">
          {/* 最優化轉帳建議 */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold">最優化轉帳建議</h2>
              {!allClear && (
                <span
                  className="px-2 py-0.5 rounded-pill text-xs font-bold"
                  style={{ background: 'var(--primary-weak)', color: 'var(--primary)' }}
                >
                  {transfers.length} 筆
                </span>
              )}
            </div>
            <p className="text-xs mb-4 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
              <Icon name="Sparkles" size={13} style={{ color: 'var(--primary)' }} />
              貪心演算法已將轉帳次數最小化
              {!allClear && ` · 共 ${formatCurrency(totalToSettle)}`}
            </p>

            {allClear ? (
              <Empty
                icon="PartyPopper"
                title="全部結清啦 🎉"
                desc="這個群組目前沒有任何待結算的款項，大家都兩不相欠。"
              />
            ) : (
              <div className="space-y-2.5">
                {transfers.map((t) => {
                  const key = `${t.from}-${t.to}`;
                  const fromMember = { userId: t.from, id: t.from, name: t.fromName };
                  const toMember = { userId: t.to, id: t.to, name: t.toName };
                  return (
                    <TransferRow
                      key={key}
                      transfer={{
                        ...t,
                        fromEnriched: enrichMember(fromMember, user?.id),
                        toEnriched: enrichMember(toMember, user?.id),
                      }}
                      onPaid={handleMarkPaid}
                      removing={removingId === key}
                    />
                  );
                })}
              </div>
            )}
          </Card>

          {/* 歷史結算紀錄 */}
          <Card className="p-5">
            <h2 className="font-bold mb-1">歷史結算紀錄</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>已完成的轉帳</p>

            {settlements.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
                <Icon name="History" size={26} className="mx-auto mb-2 opacity-50" />
                尚無結算紀錄
              </div>
            ) : (
              <div className="space-y-2.5">
                {settlements.map((s, i) => {
                  const fromEnriched = enrichMember({ userId: s.from_user_id, id: s.from_user_id, name: s.from_user_name || '?' }, user?.id);
                  const toEnriched = enrichMember({ userId: s.to_user_id, id: s.to_user_id, name: s.to_user_name || '?' }, user?.id);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 anim-fade"
                      style={{ animationDelay: i * 40 + 'ms' }}
                    >
                      <span
                        className="grid place-items-center w-9 h-9 rounded-full shrink-0"
                        style={{ background: 'var(--positive)' }}
                      >
                        <Icon name="Check" size={16} strokeWidth={3} className="text-white" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">
                          {fromEnriched.you ? '你' : fromEnriched.name}
                          <span style={{ color: 'var(--muted)' }} className="font-normal"> 付給 </span>
                          {toEnriched.you ? '你' : toEnriched.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>
                          {s.settled_at ? new Date(s.settled_at).toLocaleDateString('zh-TW') : ''}
                        </div>
                      </div>
                      <span className="tnum text-sm font-bold shrink-0">{formatCurrency(s.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
