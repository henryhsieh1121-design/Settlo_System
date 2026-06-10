import { useState } from 'react';
import { Modal, Field, Input, Button } from './ui/index';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function AddGroupModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/groups', form);
      toast.success('群組建立成功！');
      onCreated(data.group);
      setForm({ name: '', description: '' });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || '建立失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="建立新群組">
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
        <Field label="群組名稱">
          <Input
            icon="Users"
            placeholder="例：大阪旅遊、合租公寓…"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </Field>
        <Field label="說明（選填）">
          <Input
            icon="FileText"
            placeholder="簡短說明這個群組的用途"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
      </form>
      <div
        className="sticky bottom-0 flex items-center gap-3 px-5 sm:px-6 py-4 border-t"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <Button variant="ghost" className="flex-1" onClick={onClose}>取消</Button>
        <Button
          type="submit"
          className="flex-[2]"
          icon="Plus"
          loading={loading}
          disabled={!form.name.trim()}
          onClick={handleSubmit}
        >
          建立群組
        </Button>
      </div>
    </Modal>
  );
}
