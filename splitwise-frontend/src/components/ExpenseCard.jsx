import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { getCategoryEmoji } from '../utils/categories';

export default function ExpenseCard({ expense, currentUserId, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [showSplits, setShowSplits] = useState(false);

  const canDelete = expense.paid_by_id === currentUserId;

  const handleDelete = async () => {
    if (!confirm(`確定要刪除「${expense.description}」這筆費用嗎？`)) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${expense.id}`);
      onDeleted(expense.id);
    } catch (err) {
      toast.error(err.response?.data?.error || '刪除失敗');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* 類別 emoji */}
          <span className="text-2xl leading-none mt-0.5">
            {getCategoryEmoji(expense.category)}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{expense.description}</h3>
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                {expense.category}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {expense.paid_by_name} 付款 · {formatDate(expense.date)}
            </p>

            {/* 展開分攤明細 */}
            <button
              onClick={() => setShowSplits((v) => !v)}
              className="text-xs text-blue-500 mt-1 hover:underline"
            >
              {showSplits ? '收起明細' : `查看 ${expense.splits?.length || 0} 人分攤`}
            </button>

            {showSplits && expense.splits && (
              <div className="mt-2 space-y-1">
                {expense.splits.map((s) => (
                  <div key={s.userId} className="flex justify-between text-xs text-gray-500">
                    <span>{s.name}</span>
                    <span>{formatCurrency(s.amountOwed)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 ml-3 flex-shrink-0">
          <p className="font-bold text-gray-900 text-lg">{formatCurrency(expense.amount)}</p>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="刪除費用"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
