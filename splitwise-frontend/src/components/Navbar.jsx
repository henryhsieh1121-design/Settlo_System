import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './ui/index';
import Avatar from './Avatar';
import useAuthStore from '../store/useAuthStore';
import useAppearanceStore from '../store/useAppearanceStore';
import useGroupStore from '../store/useGroupStore';
import { getAvatarColor, getGroupEmoji } from '../utils/avatars';

function useClickAway(onAway) {
  const ref = useRef(null);
  const cbRef = useRef(onAway);
  useEffect(() => { cbRef.current = onAway; });
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cbRef.current(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return ref;
}

function Logo({ size = 34 }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="relative grid place-items-center rounded-xl shadow-sm"
        style={{ width: size, height: size, background: 'var(--primary-grad)' }}
      >
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="none">
          <line x1="3" y1="8"  x2="21" y2="8"  stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
          <line x1="3" y1="16" x2="21" y2="16" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
          <circle cx="15" cy="8"  r="3.5" fill="white" />
          <circle cx="9"  cy="16" r="3.5" fill="white" />
        </svg>
      </div>
      <div className="leading-tight hidden sm:block">
        <span className="font-extrabold text-[15px] tracking-tight block">算了吧</span>
        <span className="text-[9px] font-semibold tracking-widest block" style={{ color: 'var(--muted)', letterSpacing: '0.18em' }}>SETTLO</span>
      </div>
    </div>
  );
}

function GroupSwitcher({ groups, currentGroupId, onSelect }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useClickAway(close);
  const cur = groups.find((g) => g.id === currentGroupId);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 pl-2 pr-2.5 rounded-pill transition-colors max-w-[140px] sm:max-w-[200px]"
        style={{ color: 'var(--text)' }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = ''; }}
      >
        {cur ? (
          <>
            <span className="grid place-items-center w-6 h-6 rounded-lg text-sm" style={{ background: 'var(--surface-2)' }}>
              {getGroupEmoji(cur.id)}
            </span>
            <span className="font-semibold text-sm truncate">{cur.name}</span>
          </>
        ) : (
          <span className="font-semibold text-sm px-1 whitespace-nowrap" style={{ color: 'var(--muted)' }}>選擇群組</span>
        )}
        <Icon name="ChevronsUpDown" size={15} style={{ color: 'var(--muted)' }} className="shrink-0" />
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-64 border rounded-2xl shadow-pop p-1.5 z-50 anim-pop"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="px-2.5 py-1.5 text-xs font-semibold" style={{ color: 'var(--muted)' }}>你的群組</div>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { onSelect(g.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors"
              style={{
                background: g.id === currentGroupId ? 'var(--primary-weak)' : '',
                color: 'var(--text)',
              }}
              onMouseOver={(e) => { if (g.id !== currentGroupId) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseOut={(e) => { if (g.id !== currentGroupId) e.currentTarget.style.background = ''; }}
            >
              <span className="grid place-items-center w-8 h-8 rounded-lg text-base shrink-0" style={{ background: 'var(--surface-2)' }}>
                {getGroupEmoji(g.id)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{g.name}</span>
                {g.description && <span className="block text-xs truncate" style={{ color: 'var(--muted)' }}>{g.description}</span>}
              </span>
              {g.id === currentGroupId && <Icon name="Check" size={15} style={{ color: 'var(--primary)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AppearanceMenu() {
  const { direction, mode, setAppearance } = useAppearanceStore();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useClickAway(close);

  const dirs = [
    { id: 'a', label: '冷靜', desc: 'Linear 風 · 高密度', sw: ['#3b82f6', '#0f172a', '#e5e8ec'] },
    { id: 'b', label: '溫潤', desc: 'Notion 風 · 暖白留白', sw: ['#3b82f6', '#2b2926', '#ece7df'] },
    { id: 'c', label: '活潑', desc: '漸層 · 飽和彩色', sw: ['#6366f1', '#3b82f6', '#e3e4f4'] },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid place-items-center w-9 h-9 rounded-full transition-colors"
        style={{ color: 'var(--muted)' }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--muted)'; }}
        title="視覺方向"
      >
        <Icon name="Palette" size={18} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-72 border rounded-2xl shadow-pop p-2 z-50 anim-pop"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="px-2 py-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>視覺方向</span>
          </div>
          {dirs.map((d) => (
            <button
              key={d.id}
              onClick={() => setAppearance({ direction: d.id })}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors"
              style={{
                background: direction === d.id ? 'var(--primary-weak)' : '',
                color: 'var(--text)',
              }}
              onMouseOver={(e) => { if (direction !== d.id) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseOut={(e) => { if (direction !== d.id) e.currentTarget.style.background = ''; }}
            >
              <span className="flex -space-x-1">
                {d.sw.map((c, i) => (
                  <span key={i} className="w-4 h-4 rounded-full" style={{ background: c, outline: '2px solid var(--surface)' }} />
                ))}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold">方向 {d.id.toUpperCase()} · {d.label}</span>
                <span className="block text-xs" style={{ color: 'var(--muted)' }}>{d.desc}</span>
              </span>
              {direction === d.id && <Icon name="Check" size={15} style={{ color: 'var(--primary)' }} />}
            </button>
          ))}

          <div className="h-px my-1.5 mx-1" style={{ background: 'var(--border)' }} />

          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Icon name={mode === 'dark' ? 'Moon' : 'Sun'} size={16} /> 顯示模式
            </span>
            <div className="inline-flex p-0.5 rounded-pill" style={{ background: 'var(--surface-2)' }}>
              {['light', 'dark'].map((m) => (
                <button
                  key={m}
                  onClick={() => setAppearance({ mode: m })}
                  className="px-3 h-7 rounded-pill text-xs font-semibold transition-colors"
                  style={mode === m ? { background: 'var(--primary-grad)', color: '#fff' } : { color: 'var(--muted)' }}
                >
                  {m === 'light' ? '淺色' : '深色'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, onLogout, onProfile }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useClickAway(close);
  if (!user) return null;

  const displayName = user.nickname || user.name || '?';
  const enrichedUser = {
    ...user,
    id: user.id,
    short: displayName.charAt(0),
    color: getAvatarColor(user.id),
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors"
        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = ''; }}
      >
        <Avatar member={enrichedUser} size={32} />
        <Icon name="ChevronDown" size={14} style={{ color: 'var(--muted)' }} className="hidden sm:block" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 border rounded-2xl shadow-pop p-1.5 z-50 anim-pop"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar member={enrichedUser} size={40} />
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{displayName}</div>
              <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{user.email}</div>
            </div>
          </div>
          <div className="h-px my-1 mx-1" style={{ background: 'var(--border)' }} />
          <button
            onClick={() => { onProfile(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors text-left"
            style={{ color: 'var(--text)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = ''; }}
          >
            <Icon name="UserCog" size={16} /> 個人資料
          </button>
          <button
            onClick={() => { onLogout(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors text-left"
            style={{ color: 'var(--negative)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = ''; }}
          >
            <Icon name="LogOut" size={16} /> 登出
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { groups, currentGroup } = useGroupStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => navigate('/profile');

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-2 sm:gap-3">
        <button onClick={() => navigate('/dashboard')} className="shrink-0">
          <Logo />
        </button>

        <div className="w-px h-6 mx-1 hidden sm:block" style={{ background: 'var(--border)' }} />

        <GroupSwitcher
          groups={groups}
          currentGroupId={currentGroup?.id}
          onSelect={(id) => navigate(`/groups/${id}`)}
        />

        <div className="flex-1" />

        <button
          onClick={() => navigate('/dashboard')}
          className="hidden md:flex items-center gap-2 h-9 px-3 rounded-pill text-sm font-semibold transition-colors whitespace-nowrap"
          style={{ color: 'var(--muted)' }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <Icon name="LayoutGrid" size={16} /> 我的群組
        </button>

        <AppearanceMenu />
        <UserMenu user={user} onLogout={handleLogout} onProfile={handleProfile} />
      </div>
    </header>
  );
}
