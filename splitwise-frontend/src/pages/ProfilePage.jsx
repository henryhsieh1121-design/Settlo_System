import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import useAuthStore from '../store/useAuthStore';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import { Card, Button, Field, Input, Icon } from '../components/ui/index';
import { enrichMember } from '../utils/avatars';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const [nickname, setNickname] = useState(user?.nickname || user?.name || '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);

  const enrichedUser = user ? enrichMember({ ...user, id: user.id }, user.id) : null;

  const handleSaveNickname = async () => {
    if (!nickname.trim()) { toast.error('暱稱不能為空白'); return; }
    if (nickname.trim() === (user?.nickname || user?.name)) {
      toast.error('暱稱未變更'); return;
    }
    setLoadingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', { nickname: nickname.trim() });
      setUser(data.user);
      toast.success('暱稱已更新！');
    } catch (err) {
      toast.error(err.response?.data?.error || '更新失敗');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd) { toast.error('請輸入目前密碼'); return; }
    if (newPwd.length < 6) { toast.error('新密碼至少需要 6 個字元'); return; }
    if (newPwd !== confirmPwd) { toast.error('兩次輸入的新密碼不一致'); return; }
    setLoadingPwd(true);
    try {
      await api.put('/auth/profile', { current_password: currentPwd, new_password: newPwd });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      toast.success('密碼已更新！');
    } catch (err) {
      toast.error(err.response?.data?.error || '密碼更新失敗');
    } finally {
      setLoadingPwd(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 anim-fade">
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

        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-6">個人資料</h1>

        {/* 用戶概覽 */}
        <Card className="p-5 flex items-center gap-4 mb-5">
          {enrichedUser && <Avatar member={enrichedUser} size={56} />}
          <div className="min-w-0">
            <div className="font-bold text-base">{user?.nickname || user?.name}</div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{user?.email}</div>
            {user?.nickname && user?.nickname !== user?.name && (
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                原始姓名：{user.name}
              </div>
            )}
          </div>
        </Card>

        {/* 修改暱稱 */}
        <Card className="p-5 mb-5">
          <h2 className="font-bold mb-1">暱稱設定</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            暱稱會顯示在群組的費用記錄與結算頁面，預設為註冊時填入的姓名。
          </p>
          <div className="space-y-4">
            <Field label="Email（不可修改）">
              <Input value={user?.email || ''} disabled icon="Mail" />
            </Field>
            <Field label="暱稱">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="輸入你想顯示的暱稱"
                icon="User"
                maxLength={50}
              />
            </Field>
            <Button
              icon="Check"
              loading={loadingProfile}
              disabled={!nickname.trim()}
              onClick={handleSaveNickname}
            >
              儲存暱稱
            </Button>
          </div>
        </Card>

        {/* 修改密碼 */}
        <Card className="p-5">
          <h2 className="font-bold mb-1">修改密碼</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            需要先輸入目前密碼才能設定新密碼。
          </p>
          <div className="space-y-4">
            <Field label="目前密碼">
              <Input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="輸入目前密碼"
                icon="Lock"
              />
            </Field>
            <Field label="新密碼">
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="至少 6 個字元"
                icon="LockKeyhole"
              />
            </Field>
            <Field label="確認新密碼">
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="再輸入一次新密碼"
                icon="LockKeyhole"
              />
            </Field>
            {newPwd && confirmPwd && newPwd !== confirmPwd && (
              <p className="text-sm" style={{ color: 'var(--negative)' }}>
                <Icon name="AlertCircle" size={14} className="inline mr-1" />
                兩次輸入的密碼不一致
              </p>
            )}
            <Button
              icon="KeyRound"
              loading={loadingPwd}
              disabled={!currentPwd || !newPwd || !confirmPwd}
              onClick={handleChangePassword}
            >
              更新密碼
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
