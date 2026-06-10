import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal, Field, Input, Button, Segmented, Icon } from './ui/index';
import Avatar from './Avatar';
import api from '../api/axios';
import { toCents } from '../utils/formatCurrency';
import { CATEGORY_LIST, getCategoryByValue } from '../utils/categories';
import { today } from '../utils/formatDate';
import { enrichMember } from '../utils/avatars';

export default function AddExpenseModal({ open, groupId, members, currentUserId, editExpense, onClose, onAdded }) {
  const enriched = members.map((m) => enrichMember(m, currentUserId));

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState('food');
  const [paidBy, setPaidBy] = useState(currentUserId || enriched[0]?.id || '');
  const [split, setSplit] = useState('equal');
  const [shares, setShares] = useState({});
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && editExpense) {
      // 編輯模式：預填原始資料
      setTitle(editExpense.description || '');
      setAmount(((editExpense.amount || 0) / 100).toFixed(0));
      setCat(getCategoryByValue(editExpense.category || '其他').id);
      setPaidBy(editExpense.paid_by_id ?? currentUserId);
      setDate((editExpense.date || today()).slice(0, 10));
      // 預填自訂分攤（若有）
      if (editExpense.splits && editExpense.splits.length > 0) {
        const n = enriched.length;
        const base = Math.floor((editExpense.amount || 0) / n) / 100;
        const allEqual = editExpense.splits.every(
          (s) => Math.abs(s.amountOwed / 100 - base) <= 1 / 100
        );
        if (allEqual) {
          setSplit('equal'); setShares({});
        } else {
          setSplit('custom');
          const s = {};
          editExpense.splits.forEach((sp) => { s[sp.userId] = (sp.amountOwed / 100).toFixed(2); });
          setShares(s);
        }
      } else {
        setSplit('equal'); setShares({});
      }
    } else if (open) {
      setTitle(''); setAmount(''); setCat('food');
      setPaidBy(currentUserId || enriched[0]?.id || '');
      setSplit('equal'); setShares({}); setDate(today());
    }
  }, [open, editExpense]);

  const amt = parseFloat(amount) || 0;
  const customSum = enriched.reduce((s, m) => s + (parseFloat(shares[m.id]) || 0), 0);
  const remaining = Math.round((amt - customSum) * 100) / 100;
  const perHead = enriched.length ? amt / enriched.length : 0;

  const valid = title.trim() && amt > 0 && (split === 'equal' || Math.abs(remaining) < 0.01);

  const splitEvenly = () => {
    const per = Math.floor((amt / enriched.length) * 100) / 100;
    const next = {};
    enriched.forEach((m) => (next[m.id] = per.toFixed(2)));
    const used = per * enriched.length;
    const payerId = paidBy;
    next[payerId] = ((parseFloat(next[payerId]) || 0) + (amt - used)).toFixed(2);
    setShares(next);
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      const catObj = CATEGORY_LIST.find((c) => c.id === cat);
      const payload = {
        description: title.trim(),
        amount: toCents(amount),
        paid_by: paidBy,
        category: catObj?.value || '其他',
        date,
        split_type: split,
      };
      if (split === 'custom') {
        payload.custom_splits = enriched.map((m) => ({
          user_id: m.id,
          amount_owed: toCents(shares[m.id] || 0),
        }));
      }
      if (editExpense) {
        await api.put(`/expenses/${editExpense.id}`, payload);
        toast.success('費用已更新！');
      } else {
        await api.post(`/groups/${groupId}/expenses`, payload);
        toast.success('費用已新增！');
      }
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || (editExpense ? '更新失敗' : '新增失敗'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editExpense ? '編輯費用' : '新增費用'}>
      <div className="p-5 sm:p-6 space-y-5">
        {/* 費用名稱 */}
        <Field label="費用項目">
          <Input
            icon="Tag"
            placeholder="例如：一蘭拉麵、JR Pass…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </Field>

        {/* 金額 + 日期 */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="金額">
            <Input
              prefix="NT$"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tnum text-base font-semibold"
            />
          </Field>
          <Field label="日期">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>

        {/* 類別 */}
        <Field label="類別">
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_LIST.map((c) => {
              const active = cat === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200"
                  style={active
                    ? { background: c.color + '1f', borderColor: c.color }
                    : { borderColor: 'var(--border)', background: 'transparent' }}
                  onMouseOver={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseOut={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span
                    className="grid place-items-center w-9 h-9 rounded-lg"
                    style={{ background: c.color + '26', color: c.color }}
                  >
                    <Icon name={c.icon} size={18} strokeWidth={2.2} />
                  </span>
                  <span className="text-xs font-semibold" style={active ? { color: c.color } : { color: 'var(--text)' }}>
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        {/* 付款人 */}
        <Field label="誰付的款">
          <div className="flex flex-wrap gap-2">
            {enriched.map((m) => {
              const active = paidBy === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaidBy(m.id)}
                  className="flex items-center gap-2 pl-1 pr-3 h-9 rounded-pill border transition-all"
                  style={active
                    ? { borderColor: 'var(--primary)', background: 'var(--primary-weak)', color: 'var(--primary)' }
                    : { borderColor: 'var(--border)', background: 'transparent', color: 'var(--text)' }}
                >
                  <Avatar member={m} size={26} />
                  <span className="text-sm font-semibold whitespace-nowrap">{m.you ? '你' : m.name}</span>
                </button>
              );
            })}
          </div>
        </Field>

        {/* 分帳方式 */}
        <Field label="分帳方式">
          <Segmented
            options={[{ value: 'equal', label: '均分' }, { value: 'custom', label: '自訂金額' }]}
            value={split}
            onChange={(v) => {
              setSplit(v);
              if (v === 'custom' && Object.keys(shares).length === 0) splitEvenly();
            }}
          />
        </Field>

        {/* 均分預覽 */}
        {split === 'equal' && (
          <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)' }}>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--muted)' }} className="whitespace-nowrap">每人平均</span>
              <span className="tnum font-bold text-base" style={{ color: 'var(--primary)' }}>
                NT${perHead > 0 ? perHead.toFixed(2) : '0'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {enriched.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-pill text-xs font-medium"
                  style={{ background: 'var(--surface)', color: 'var(--text)' }}
                >
                  <Avatar member={m} size={18} /> {m.you ? '你' : m.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 自訂分攤 */}
        {split === 'custom' && (
          <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'var(--surface-2)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm" style={{ color: 'var(--muted)' }}>各自分攤</span>
              <button
                type="button"
                onClick={splitEvenly}
                className="text-xs font-semibold flex items-center gap-1"
                style={{ color: 'var(--primary)' }}
              >
                <Icon name="SplitSquareHorizontal" size={13} /> 平均填入
              </button>
            </div>
            {enriched.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar member={m} size={28} />
                <span className="text-sm font-medium flex-1">{m.you ? '你' : m.name}</span>
                <div className="relative w-32">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: 'var(--muted)' }}>NT$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={shares[m.id] ?? ''}
                    placeholder="0"
                    onChange={(e) => setShares((s) => ({ ...s, [m.id]: e.target.value }))}
                    className="tnum w-full h-9 pl-9 pr-2.5 rounded-lg text-sm font-semibold text-right focus:outline-none border"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2.5 mt-1 border-t text-sm" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--muted)' }}>剩餘待分配</span>
              <span
                className="tnum font-bold"
                style={{ color: Math.abs(remaining) < 0.01 ? 'var(--positive)' : 'var(--negative)' }}
              >
                NT${remaining > 0 ? '+' : ''}{remaining.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 底部按鈕 */}
      <div
        className="sticky bottom-0 flex items-center gap-3 px-5 sm:px-6 py-4 pb-safe border-t"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <Button variant="ghost" className="flex-1" onClick={onClose}>取消</Button>
        <Button
          className="flex-[2]"
          icon="Check"
          disabled={!valid}
          loading={loading}
          onClick={handleSubmit}
        >
          {editExpense ? '儲存修改' : '新增費用'}
        </Button>
      </div>
    </Modal>
  );
}
