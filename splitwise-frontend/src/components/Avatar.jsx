import { getAvatarColor } from '../utils/avatars';

export default function Avatar({ member, size = 32, ring = false }) {
  if (!member) return null;

  const userId = member.userId || member.id;
  const color = member.color || getAvatarColor(userId);
  const short = member.short || (member.name || '?').charAt(0);

  const fontSize = size <= 20 ? 9 : size <= 28 ? 11 : size <= 36 ? 13 : 14;

  return (
    <span
      className={'inline-grid place-items-center rounded-full shrink-0 font-bold select-none ' + (ring ? 'ring-2 ring-[var(--surface)]' : '')}
      style={{
        width: size,
        height: size,
        background: color,
        color: '#fff',
        fontSize,
        minWidth: size,
      }}
      title={member.name}
    >
      {short}
    </span>
  );
}
