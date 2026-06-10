import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../store/useAuthStore';
import useGroupStore from '../store/useGroupStore';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import AddGroupModal from '../components/AddGroupModal';
import { Card, Button, Empty, Icon } from '../components/ui/index';
import { formatCurrency } from '../utils/formatCurrency';
import { getGroupCover, getGroupEmoji, getAvatarColor, enrichMember } from '../utils/avatars';

function GroupCard({ group, members, myBalance, totalAmount, onClick }) {
  const myBal = myBalance ?? 0;

  return (
    <Card hover className="overflow-hidden" onClick={onClick}>
      {/* 封面 */}
      <div className="h-20 relative" style={{ background: getGroupCover(group.id) }}>
        <div className="absolute inset-0 flex items-center justify-between px-5">
          <span className="text-4xl drop-shadow-sm">{getGroupEmoji(group.id)}</span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">{group.name}</h3>
            {group.description && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{group.description}</p>
            )}
          </div>
          <Icon name="ArrowUpRight" size={18} style={{ color: 'var(--muted)' }} className="shrink-0 mt-0.5" />
        </div>

        <div className="flex items-center justify-between">
          {/* 成員頭像堆疊 */}
          <div className="flex -space-x-2">
            {(members || []).slice(0, 4).map((m) => (
              <Avatar key={m.id || m.userId} member={m} size={28} ring />
            ))}
            {(members || []).length > 4 && (
              <span
                className="grid place-items-center w-7 h-7 rounded-full text-xs font-semibold"
                style={{ background: 'var(--surface-2)', color: 'var(--muted)', outline: '2px solid var(--surface)' }}
              >
                +{members.length - 4}
              </span>
            )}
          </div>

          {/* 餘額 */}
          <div className="text-right">
            {totalAmount > 0 ? (
              Math.abs(myBal) < 1 ? (
                <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>已結清</span>
              ) : (
                <>
                  <span className="block text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                    {myBal > 0 ? '別人欠你' : '你需付出'}
                  </span>
                  <span
                    className="tnum text-sm font-bold"
                    style={{ color: myBal > 0 ? 'var(--positive)' : 'var(--negative)' }}
                  >
                    {formatCurrency(Math.abs(myBal))}
                  </span>
                </>
              )
            ) : (
              <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>尚無費用</span>
            )}
          </div>
        </div>

        {totalAmount > 0 && (
          <div className="mt-4 pt-3.5 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--muted)' }}>總支出</span>
            <span className="tnum font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { groups, setGroups, addGroup } = useGroupStore();
  const [loading, setLoading] = useState(true);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupStats, setGroupStats] = useState({});

  useEffect(() => {
    const init = async () => {
      try {
        const [meRes, groupsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/groups'),
        ]);
        setUser(meRes.data.user);
        setGroups(groupsRes.data.groups);
      } catch {
        toast.error('載入資料失敗');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [setUser, setGroups]);

  // 非同步取得每個群組的餘額（用於 summary band + group cards）
  useEffect(() => {
    if (!groups.length || !user) return;
    const fetchStats = async () => {
      const results = {};
      await Promise.all(groups.map(async (g) => {
        try {
          const { data } = await api.get(`/groups/${g.id}/balance`);
          const mine = data.balances?.find((b) => b.userId === user.id);
          results[g.id] = {
            balance: mine?.balance ?? 0,
            members: data.balances || [],
          };
        } catch { /* 忽略個別群組錯誤 */ }
      }));
      setGroupStats(results);
    };
    fetchStats();
  }, [groups, user]);

  const handleGroupCreated = (group) => {
    addGroup(group);
    setShowAddGroup(false);
  };

  // 跨群組餘額彙總
  let totalOwed = 0, totalOwe = 0;
  groups.forEach((g) => {
    const bal = groupStats[g.id]?.balance ?? 0;
    if (bal > 0) totalOwed += bal;
    else totalOwe += -bal;
  });

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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 anim-fade">
        {/* 標題列 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              嗨，{user?.nickname || user?.name || '用戶'} 👋
            </h1>
            <p className="mt-1.5" style={{ color: 'var(--muted)' }}>
              {groups.length > 0
                ? `你目前在 ${groups.length} 個群組裡算帳，繼續把它算了吧。`
                : '還沒有群組，要不要先把帳算起來？'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" icon="Link" onClick={() => navigate('/join')}>
              <span className="hidden sm:inline">以邀請碼加入</span>
              <span className="sm:hidden">邀請碼</span>
            </Button>
            <Button icon="Plus" size="lg" onClick={() => setShowAddGroup(true)}>
              建立群組
            </Button>
          </div>
        </div>

        {groups.length > 0 && (
          /* 彙總統計 */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
            <Card className="p-4 sm:p-5">
              <span className="text-xs sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                <Icon name="TrendingUp" size={14} style={{ color: 'var(--positive)' }} />別人總共欠你
              </span>
              <div className="tnum text-xl sm:text-2xl font-bold mt-2" style={{ color: 'var(--positive)' }}>
                {formatCurrency(totalOwed)}
              </div>
            </Card>
            <Card className="p-4 sm:p-5">
              <span className="text-xs sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                <Icon name="TrendingDown" size={14} style={{ color: 'var(--negative)' }} />你總共欠別人
              </span>
              <div className="tnum text-xl sm:text-2xl font-bold mt-2" style={{ color: 'var(--negative)' }}>
                {formatCurrency(totalOwe)}
              </div>
            </Card>
            <Card className="p-4 sm:p-5 col-span-2 sm:col-span-1">
              <span className="text-xs sm:text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
                <Icon name="Scale" size={14} style={{ color: 'var(--primary)' }} />淨額
              </span>
              <div
                className="tnum text-xl sm:text-2xl font-bold mt-2"
                style={{ color: totalOwed - totalOwe >= 0 ? 'var(--positive)' : 'var(--negative)' }}
              >
                {totalOwed - totalOwe >= 0 ? '+' : ''}{formatCurrency(Math.abs(totalOwed - totalOwe))}
              </div>
            </Card>
          </div>
        )}

        {/* 群組列表標題 */}
        {groups.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">你的群組</h2>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>{groups.length} 個</span>
          </div>
        )}

        {groups.length === 0 ? (
          <Empty
            icon="Users"
            title="還沒有任何群組"
            desc="建立第一個群組，或輸入邀請碼加入朋友的帳單——帳算清楚，友情才能算了。"
            action={
              <div className="flex items-center gap-3">
                <Button variant="outline" icon="Link" onClick={() => navigate('/join')}>以邀請碼加入</Button>
                <Button icon="Plus" size="lg" onClick={() => setShowAddGroup(true)}>建立群組</Button>
              </div>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {groups.map((g, i) => {
              const stats = groupStats[g.id];
              const enrichedMembers = (stats?.members || []).map((m) => enrichMember(m, user?.id));
              return (
                <div key={g.id} className="anim-slide" style={{ animationDelay: i * 60 + 'ms' }}>
                  <GroupCard
                    group={g}
                    members={enrichedMembers}
                    myBalance={stats?.balance}
                    totalAmount={stats ? stats.members.reduce((s, b) => s + (b.totalPaid || 0), 0) : null}
                    onClick={() => navigate(`/groups/${g.id}`)}
                  />
                </div>
              );
            })}

            {/* 建立新群組 tile */}
            <button
              onClick={() => setShowAddGroup(true)}
              className="rounded-card border-2 border-dashed min-h-[200px] grid place-items-center transition-colors group"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-weak)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--muted)'; }}
            >
              <span className="flex flex-col items-center gap-2.5">
                <span className="grid place-items-center w-12 h-12 rounded-2xl transition-colors" style={{ background: 'var(--surface-2)' }}>
                  <Icon name="Plus" size={24} />
                </span>
                <span className="font-semibold text-sm">建立新群組</span>
              </span>
            </button>
          </div>
        )}
      </main>

      <AddGroupModal
        open={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onCreated={handleGroupCreated}
      />
    </div>
  );
}
