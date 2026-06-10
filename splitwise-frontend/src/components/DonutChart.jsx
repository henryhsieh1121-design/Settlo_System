import { useState, useEffect } from 'react';

export default function DonutChart({ data, size = 168, thickness = 22, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  let offset = 0;
  const segs = data.map((d, i) => {
    const frac = d.value / total;
    const len = frac * C;
    const seg = { ...d, frac, dash: len, start: offset, i };
    offset += len;
    return seg;
  });
  const cx = size / 2, cy = size / 2;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
            {segs.map((s) => (
              <circle
                key={s.i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={hover === s.i ? thickness + 4 : thickness}
                strokeLinecap="butt"
                strokeDasharray={`${mounted ? s.dash : 0} ${C}`}
                strokeDashoffset={-s.start}
                style={{
                  transition: 'stroke-dasharray 0.9s cubic-bezier(.16,1,.3,1), stroke-width .2s',
                  opacity: hover === null || hover === s.i ? 1 : 0.4,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHover(s.i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
          <div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {hover !== null ? segs[hover].label : centerLabel}
            </div>
            <div
              className="tnum text-lg font-bold leading-tight"
              style={{ color: hover !== null ? segs[hover].color : 'var(--text)' }}
            >
              {hover !== null ? segs[hover].sub : centerValue}
            </div>
            {hover !== null && (
              <div className="tnum text-xs" style={{ color: 'var(--muted)' }}>
                {Math.round(segs[hover].frac * 100)}%
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-[140px] space-y-2">
        {segs.map((s) => (
          <div
            key={s.i}
            className="flex items-center gap-2.5 cursor-pointer"
            onMouseEnter={() => setHover(s.i)}
            onMouseLeave={() => setHover(null)}
            style={{ opacity: hover === null || hover === s.i ? 1 : 0.45, transition: 'opacity .2s' }}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-sm font-medium flex-1 truncate">{s.label}</span>
            <span className="tnum text-sm font-semibold">{Math.round(s.frac * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
