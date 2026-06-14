import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../store/useAuthStore';
import useAppearanceStore from '../store/useAppearanceStore';
import { Button, Field, Input, Icon } from '../components/ui/index';

const AVATAR_COLORS = ['#3b82f6', '#ec4899', '#14b8a6', '#f59e0b'];
const AVATAR_SHORTS = ['哲', '君', '豪', '婷'];

function Logo({ size = 34 }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
        src="/Logo.png"
        alt="算了吧 Settlo"
        style={{ width: size, height: size, borderRadius: '10px', objectFit: 'cover' }}
      />
      <div className="leading-tight">
        <span className="font-extrabold text-[16px] tracking-tight block">算了吧</span>
        <span className="text-[10px] font-semibold tracking-widest block" style={{ color: 'var(--muted)', letterSpacing: '0.15em' }}>SETTLO</span>
      </div>
    </div>
  );
}

export default function LoginPage({ initialMode = 'login' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const { mode, setAppearance } = useAppearanceStore();

  const [authMode, setAuthMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', pw: '', pw2: '' });
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const pwOk = form.pw.length >= 6;
  const nameOk = form.name.trim().length >= 1;
  const pw2Ok = form.pw === form.pw2 && form.pw2.length > 0;
  const valid = authMode === 'login'
    ? emailOk && pwOk
    : nameOk && emailOk && pwOk && pw2Ok;

  const err = {
    email: touched.email && form.email && !emailOk ? '請輸入有效的 Email 格式' : '',
    pw: touched.pw && form.pw && !pwOk ? '密碼至少需 6 個字元' : '',
    pw2: touched.pw2 && form.pw2 && !pw2Ok ? '兩次密碼輸入不一致' : '',
    name: touched.name && form.name !== '' && !nameOk ? '請輸入暱稱' : '',
  };

  const switchMode = (m) => { setAuthMode(m); setTouched({}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) { setTouched({ name: true, email: true, pw: true, pw2: true }); return; }
    setLoading(true);
    try {
      const redirectTo = (() => {
        const r = searchParams.get('redirect');
        return r && r.startsWith('/') ? r : '/dashboard';
      })();
      if (authMode === 'login') {
        const { data } = await api.post('/auth/login', { email: form.email, password: form.pw });
        login(data.token, data.user);
        const displayName = data.user.nickname || data.user.name;
        toast.success(`歡迎回來，${displayName}！`);
        navigate(redirectTo);
      } else {
        const { data } = await api.post('/auth/register', { name: form.name, email: form.email, password: form.pw });
        login(data.token, data.user);
        toast.success(`帳號建立成功，${data.user.name}！算了吧，出發吧 🎉`);
        navigate(redirectTo);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || (authMode === 'login' ? '登入失敗' : '註冊失敗'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]" style={{ background: 'var(--bg)' }}>
      {/* 左側品牌面板 */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'var(--primary-grad)' }}
      >
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-10 -left-20 w-80 h-80 rounded-full bg-white/10 blur-2xl" />

        {/* 左上 Logo */}
        <div className="relative flex items-center gap-2.5 text-white">
          <img
            src="/Logo.png"
            alt="算了吧 Settlo"
            style={{ width: 36, height: 36, borderRadius: '10px', objectFit: 'cover' }}
          />
          <div className="leading-tight">
            <span className="font-extrabold text-base block">算了吧</span>
            <span className="text-[10px] font-semibold tracking-widest block opacity-70">SETTLO</span>
          </div>
        </div>

        {/* 主文案 */}
        <div className="relative text-white">
          <p className="text-white/60 text-sm font-medium mb-3 tracking-wide">把帳算清楚，才能真的算了。</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.15] tracking-tight mb-5">
            盡情玩吧 ! <br />
            <span className="opacity-70">算錢的事，交給 Settlo 算了吧 ! </span>
          </h1>
          <p className="text-white/75 text-base leading-relaxed max-w-sm mb-10">
            跟朋友吃飯旅遊，不用再尷尬誰去付帳。<br />
            Settlo 幫你記、幫你分、幫你清，<br />
            讓每一筆都明明白白，然後真的算了。
          </p>

          {/* 功能特點 */}
          <div className="space-y-3 max-w-sm">
            {[
              { i: 'BookOpen', t: '群組記帳', d: '建立群組，誰付了多少，全部一清二楚' },
              { i: 'Sparkles', t: '最優結算', d: '演算法幫你找最少轉帳次數的還錢方式' },
              { i: 'SplitSquareHorizontal', t: '彈性分帳', d: '均分或自訂，每一分都你說了算' },
              { i: 'PieChart', t: '帳目洞察', d: '支出分類統計，看誰這趟最慷慨' },
            ].map((x) => (
              <div key={x.t} className="flex items-center gap-3">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/15 backdrop-blur shrink-0">
                  <Icon name={x.i} size={17} className="text-white" />
                </span>
                <div>
                  <span className="text-white font-semibold text-sm block leading-tight">{x.t}</span>
                  <span className="text-white/60 text-xs block">{x.d}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部社交證明 */}
        <div className="relative flex items-center gap-3 text-white/70 text-sm">
          <div className="flex -space-x-2">
            {AVATAR_SHORTS.map((s, i) => (
              <span
                key={i}
                className="w-7 h-7 rounded-full grid place-items-center text-white text-xs font-semibold"
                style={{ background: AVATAR_COLORS[i], outline: '2px solid rgba(255,255,255,0.3)' }}
              >
                {s}
              </span>
            ))}
          </div>
          已有 12,000+ 旅伴一起算了吧 ✓
        </div>
      </div>

      {/* 右側表單面板 */}
      <div
        className="relative flex flex-col items-center justify-center p-6 sm:p-10"
        style={{ background: 'var(--bg)' }}
      >
        {/* 深/淺色切換 */}
        <div className="absolute top-5 right-5">
          <button
            onClick={() => setAppearance({ mode: mode === 'dark' ? 'light' : 'dark' })}
            className="grid place-items-center w-9 h-9 rounded-full transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = ''; }}
            title="切換深淺色"
          >
            <Icon name={mode === 'dark' ? 'Sun' : 'Moon'} size={18} />
          </button>
        </div>

        <div className="w-full max-w-sm anim-slide">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size={40} />
          </div>

          <h2 className="text-2xl font-extrabold mb-1.5">
            {authMode === 'login' ? '歡迎回來 👋' : '加入算了吧'}
          </h2>
          <p className="text-sm mb-7" style={{ color: 'var(--muted)' }}>
            {authMode === 'login'
              ? '繼續管理你的群組，把帳算清楚。'
              : '30 秒建立帳號，馬上開始你的第一個 Settlo。'}
          </p>

          {/* 登入 / 註冊切換 */}
          <div className="inline-flex w-full p-1 rounded-pill mb-6" style={{ background: 'var(--surface-2)' }}>
            {[{ v: 'login', l: '登入' }, { v: 'register', l: '註冊' }].map((t) => (
              <button
                key={t.v}
                onClick={() => switchMode(t.v)}
                className="flex-1 h-9 rounded-pill text-sm font-semibold transition-all duration-200"
                style={authMode === t.v
                  ? { background: 'var(--primary-grad)', color: '#fff' }
                  : { color: 'var(--muted)' }}
              >
                {t.l}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' && (
              <Field label="暱稱" error={err.name}>
                <Input icon="User" placeholder="例如：阿哲" value={form.name} onChange={set('name')} onBlur={blur('name')} error={err.name} />
              </Field>
            )}
            <Field label="Email" error={err.email}>
              <Input icon="Mail" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} onBlur={blur('email')} error={err.email} />
            </Field>
            <Field label="密碼" error={err.pw} hint={authMode === 'register' && !err.pw ? '至少 6 個字元' : undefined}>
              <div className="relative">
                <Input icon="Lock" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.pw} onChange={set('pw')} onBlur={blur('pw')} error={err.pw} className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--muted)' }}
                >
                  <Icon name={showPw ? 'EyeOff' : 'Eye'} size={16} />
                </button>
              </div>
            </Field>
            {authMode === 'register' && (
              <Field label="確認密碼" error={err.pw2}>
                <Input icon="Lock" type="password" placeholder="••••••••" value={form.pw2} onChange={set('pw2')} onBlur={blur('pw2')} error={err.pw2} />
              </Field>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={!valid}
              loading={loading}
              iconRight={!loading ? 'ArrowRight' : undefined}
              className="w-full mt-1"
            >
              {loading ? '處理中…' : authMode === 'login' ? '登入' : '建立帳號'}
            </Button>
          </form>

          <p className="text-center text-sm mt-7" style={{ color: 'var(--muted)' }}>
            {authMode === 'login' ? '還沒有帳號？' : '已經有帳號了？'}
            <button
              onClick={() => switchMode(authMode === 'login' ? 'register' : 'login')}
              className="font-semibold ml-1"
              style={{ color: 'var(--primary)' }}
            >
              {authMode === 'login' ? '立即註冊' : '前往登入'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
