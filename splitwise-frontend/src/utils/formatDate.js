// 將日期字串格式化為繁體中文顯示，例："2024-03-15" → "2024/03/15"
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// 取得今天日期的 ISO 格式字串，用於 date input 預設值
export function today() {
  return new Date().toISOString().split('T')[0];
}
