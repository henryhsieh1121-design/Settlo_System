// 將「分」轉換為顯示用字串，例：35050 → "NT$350.50"
export function formatCurrency(cents) {
  if (typeof cents !== 'number') return 'NT$0';
  const amount = cents / 100;
  return `NT$${amount.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// 將元（小數）轉換為分（整數），例：350.5 → 35050
export function toCents(yuan) {
  return Math.round(parseFloat(yuan) * 100);
}

// 將分轉換為元（顯示用），例：35050 → 350.5
export function toYuan(cents) {
  return cents / 100;
}
