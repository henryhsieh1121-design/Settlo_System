import { useState, useEffect } from 'react';
import { Modal, Field, Input, Button, Segmented, Icon } from './ui/index';
import api from '../api/axios';
import toast from 'react-hot-toast';

// 邀請碼顯示區塊
function InviteCodePanel({ groupId }) {
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  // 載入時取得群組現有邀請碼
  useEffect(() => {
    api.get(`/groups/${groupId}`)
      .then(({ data }) => setCode(data.group.invite_code || null))
      .catch(() => {});
  }, [groupId]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/groups/${groupId}/invite`);
      setCode(data.invite_code);
      toast.success('邀請碼已產生！');
    } catch {
      toast.error('產生失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      toast.error('複製失敗，請手動複製');
    }
  };

  const joinUrl = code ? `${window.location.origin}/join?code=${code}` : '';

  if (!code) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <div
          className="grid place-items-center w-16 h-16 rounded-2xl border"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--primary)' }}
        >
          <Icon name="Link" size={28} strokeWidth={1.8} />
        </div>
        <div>
          <p className="font-semibold">尚未產生邀請碼</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            產生後任何人用連結即可加入，不需要對方的 Email。
          </p>
        </div>
        <Button icon="Sparkles" loading={loading} onClick={generate}>
          產生邀請碼
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        分享邀請碼或連結給隊友，對方登入後即可加入群組。
      </p>

      {/* 邀請碼大字顯示 */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border"
        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
      >
        <span
          className="tnum text-3xl font-extrabold tracking-[0.2em]"
          style={{ color: 'var(--primary)', letterSpacing: '0.22em' }}
        >
          {code}
        </span>
        <button
          onClick={() => copyText(code, 'code')}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-pill text-xs font-semibold border shrink-0 transition-colors"
          style={copied === 'code'
            ? { background: 'var(--positive)', borderColor: 'var(--positive)', color: '#fff' }
            : { borderColor: 'var(--border)', color: 'var(--muted)' }}
          onMouseOver={(e) => { if (copied !== 'code') e.currentTarget.style.background = 'var(--surface)'; }}
          onMouseOut={(e) => { if (copied !== 'code') e.currentTarget.style.background = ''; }}
        >
          <Icon name={copied === 'code' ? 'Check' : 'Copy'} size={13} />
          {copied === 'code' ? '已複製' : '複製'}
        </button>
      </div>

      {/* 連結複製 */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
      >
        <Icon name="Link2" size={14} style={{ color: 'var(--muted)' }} className="shrink-0" />
        <span className="text-xs truncate flex-1" style={{ color: 'var(--muted)' }}>{joinUrl}</span>
        <button
          onClick={() => copyText(joinUrl, 'link')}
          className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-semibold border shrink-0 transition-colors"
          style={copied === 'link'
            ? { background: 'var(--positive)', borderColor: 'var(--positive)', color: '#fff' }
            : { borderColor: 'var(--border)', color: 'var(--muted)' }}
          onMouseOver={(e) => { if (copied !== 'link') e.currentTarget.style.background = 'var(--surface)'; }}
          onMouseOut={(e) => { if (copied !== 'link') e.currentTarget.style.background = ''; }}
        >
          <Icon name={copied === 'link' ? 'Check' : 'Copy'} size={12} />
          {copied === 'link' ? '已複製' : '複製連結'}
        </button>
      </div>

      {/* 重新產生 */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          重新產生後舊邀請碼立即失效
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
          style={{ color: 'var(--negative)' }}
        >
          <Icon name="RefreshCw" size={12} />
          重新產生
        </button>
      </div>
    </div>
  );
}

export default function AddMemberModal({ open, groupId, onClose, onAdded }) {
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // 關閉時重設狀態
  useEffect(() => {
    if (!open) { setEmail(''); setTab('email'); }
  }, [open]);

  const handleEmailSubmit = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/groups/${groupId}/members`, { email });
      toast.success('成員已加入！');
      onAdded(data.member);
      setEmail('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || '新增成員失敗，請確認 Email 是否正確');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="邀請成員">
      {/* Tab 切換 */}
      <div className="px-5 sm:px-6 pt-4 pb-0">
        <Segmented
          options={[
            { value: 'email', label: 'Email 邀請' },
            { value: 'code', label: '邀請碼' },
          ]}
          value={tab}
          onChange={setTab}
          className="w-full"
        />
      </div>

      <div className="p-5 sm:p-6">
        {tab === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Field label="成員 Email" hint="對方必須已在系統中註冊帳號">
              <Input
                icon="Mail"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </Field>
            <div className="flex items-center gap-3 pt-1">
              <Button variant="ghost" className="flex-1" type="button" onClick={onClose}>取消</Button>
              <Button
                className="flex-[2]"
                icon="UserPlus"
                loading={loading}
                disabled={!email.trim()}
              >
                加入成員
              </Button>
            </div>
          </form>
        ) : (
          <InviteCodePanel groupId={groupId} />
        )}
      </div>
    </Modal>
  );
}
