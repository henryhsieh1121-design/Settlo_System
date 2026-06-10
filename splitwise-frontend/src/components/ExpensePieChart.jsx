import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatCurrency';

// 圓餅圖色票
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ExpensePieChart({ expenses, members }) {
  // 依付款人統計各人付款總額
  const memberMap = {};
  members.forEach((m) => { memberMap[m.id] = m.name; });

  const dataMap = {};
  expenses.forEach((e) => {
    const name = memberMap[e.paid_by_id] || '未知';
    dataMap[name] = (dataMap[name] || 0) + e.amount;
  });

  const data = Object.entries(dataMap).map(([name, value]) => ({ name, value }));

  if (data.length === 0) return null;

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-800 mb-3">付款比例</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
          />
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: '12px', color: '#374151' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
