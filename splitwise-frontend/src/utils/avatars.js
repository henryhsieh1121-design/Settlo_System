// 為每位使用者指定的固定顏色（依 userId 取模）
export const AVATAR_COLORS = [
  '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b',
  '#8b5cf6', '#ef4444', '#f97316', '#06b6d4',
];

// 群組封面漸層
export const COVER_GRADIENTS = [
  'linear-gradient(135deg,#fbcfe8,#c7d2fe)',
  'linear-gradient(135deg,#fed7aa,#fecaca)',
  'linear-gradient(135deg,#bae6fd,#ddd6fe)',
  'linear-gradient(135deg,#bbf7d0,#bae6fd)',
  'linear-gradient(135deg,#fef9c3,#fed7aa)',
  'linear-gradient(135deg,#f5d0fe,#fbcfe8)',
  'linear-gradient(135deg,#a7f3d0,#c7d2fe)',
  'linear-gradient(135deg,#fde68a,#a7f3d0)',
];

// 群組預設 emoji
export const GROUP_EMOJIS = ['✈️', '🍜', '🎿', '🌸', '🎵', '🏖️', '🎭', '🍻', '🗺️', '🏔️'];

export function getAvatarColor(userId) {
  return AVATAR_COLORS[(userId || 0) % AVATAR_COLORS.length];
}

export function getGroupCover(groupId) {
  return COVER_GRADIENTS[(groupId || 0) % COVER_GRADIENTS.length];
}

export function getGroupEmoji(groupId) {
  return GROUP_EMOJIS[(groupId || 0) % GROUP_EMOJIS.length];
}

// 將 API 成員資料加上顏色和 you 旗標
export function enrichMember(member, currentUserId) {
  const userId = member.userId || member.id;
  return {
    ...member,
    id: userId,
    short: (member.name || '?').charAt(0),
    color: getAvatarColor(userId),
    you: userId === currentUserId,
  };
}
