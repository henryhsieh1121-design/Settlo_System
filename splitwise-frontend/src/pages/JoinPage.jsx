import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { Button, Field, Input, Icon } from '../components/ui/index';

export default function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);

  // URL 帶 code 時自動提交
  useEffect(() => {
    if (searchParams.get('code')) handleJoin();
  }, []); // 只在 mount 時執行一次

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      const { data } = await api.post('/groups/join', { invite_code: trimmed });
      toast.success(`已加入「${data.group.name}」！`);
      navigate(`/groups/${data.group.id}`);
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        // 已是成員，直接跳轉
        toast('你已經是這個群組的成員了');
        navigate(`/groups/${err.response.data.groupId}`);
      } else {
        toast.error(err.response?.data?.error || '無效的邀請碼，請確認後再試');
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm anim-slide">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div
            className="grid place-items-center rounded-xl shadow-sm"
            style={{ width: 36, height: 36, background: 'var(--primary-grad)' }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.2" />
              <path d="M12 3 v18" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M12 8.5 h-2.2 a2 2 0 100 4 h2.2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
              <path d="M12 11.5 h2.2 a2 2 0 110 4 H12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-extrabold text-[17px] tracking-tight">分帳無痛</span>
        </div>

        {/* 卡片 */}
        <div
          className="border rounded-2xl p-7 shadow-pop"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-center mb-6">
            <div
              className="grid place-items-center w-14 h-14 rounded-2xl mx-auto mb-4"
              style={{ background: 'var(--primary-weak)', color: 'var(--primary)' }}
            >
              <Icon name="Link" size={26} strokeWidth={1.8} />
            </div>
            <h1 className="text-xl font-extrabold">加入群組</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--muted)' }}>
              輸入 6 碼邀請碼即可加入好友群組
            </p>
          </div>

          <Field label="邀請碼">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="例如：AB3X9K"
              maxLength={6}
              className="tnum w-full h-14 rounded-xl text-center text-2xl font-extrabold tracking-[0.25em] border focus:outline-none focus:ring-2 transition-all placeholder:opacity-30 placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--primary)',
              }}
              autoFocus
              autoCapitalize="characters"
              spellCheck={false}
            />
          </Field>

          <Button
            className="w-full mt-5"
            size="lg"
            icon="LogIn"
            loading={loading}
            disabled={code.trim().length !== 6}
            onClick={handleJoin}
          >
            加入群組
          </Button>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm mx-auto mt-5 transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <Icon name="ChevronLeft" size={15} /> 回到我的群組
        </button>
      </div>
    </div>
  );
}
