// 類別定義（與後端 category 欄位對應）
export const CATEGORIES = {
  food:      { id: 'food',      value: '餐飲', label: '餐飲', icon: 'Utensils',    color: '#f97316' },
  transport: { id: 'transport', value: '交通', label: '交通', icon: 'Car',         color: '#0ea5e9' },
  lodging:   { id: 'lodging',   value: '住宿', label: '住宿', icon: 'BedDouble',   color: '#8b5cf6' },
  fun:       { id: 'fun',       value: '娛樂', label: '娛樂', icon: 'Gamepad2',    color: '#ec4899' },
  shopping:  { id: 'shopping',  value: '購物', label: '購物', icon: 'ShoppingBag', color: '#14b8a6' },
  other:     { id: 'other',     value: '其他', label: '其他', icon: 'NotebookPen', color: '#64748b' },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

const VALUE_TO_ID = {
  '餐飲': 'food', '交通': 'transport', '住宿': 'lodging',
  '娛樂': 'fun', '購物': 'shopping', '其他': 'other',
};

export function getCategoryById(id) {
  return CATEGORIES[id] || CATEGORIES.other;
}

export function getCategoryByValue(value) {
  const id = VALUE_TO_ID[value] || 'other';
  return CATEGORIES[id];
}
