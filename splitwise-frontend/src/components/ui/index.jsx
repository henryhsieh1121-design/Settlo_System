import React from 'react';
import * as LucideIcons from 'lucide-react';

// 動態 Lucide Icon 元件
export function Icon({ name, size = 16, strokeWidth = 2, className = '', style }) {
  const LucideIcon = LucideIcons[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} strokeWidth={strokeWidth} className={className} style={style} />;
}

// Button
export function Button({
  children, variant = 'primary', size = 'md', icon, iconRight,
  disabled, loading, className = '', onClick, type = 'button', ...rest
}) {
  const sizes = {
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-5 text-base gap-2',
    icon: 'h-10 w-10 justify-center',
  };
  const variantClass = {
    primary: 'text-white shadow-sm hover:brightness-110 active:brightness-95',
    soft: 'hover:opacity-80',
    ghost: 'hover:opacity-80',
    outline: 'border hover:opacity-80',
    danger: 'text-white hover:brightness-110',
    positive: 'text-white hover:brightness-110',
  };
  const variantStyle = {
    primary: { background: 'var(--primary-grad)' },
    soft:    { background: 'var(--primary-weak)', color: 'var(--primary)' },
    ghost:   { color: 'var(--muted)' },
    outline: { borderColor: 'var(--border)', background: 'transparent', color: 'var(--text)' },
    danger:  { background: 'var(--negative)' },
    positive:{ background: 'var(--positive)' },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={variantStyle[variant]}
      className={
        'inline-flex items-center rounded-pill font-semibold transition-all duration-200 whitespace-nowrap ' +
        'disabled:opacity-40 disabled:cursor-not-allowed ' +
        'focus:outline-none ' +
        sizes[size] + ' ' + variantClass[variant] + ' ' + className
      }
      {...rest}
    >
      {loading
        ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        : icon && <Icon name={icon} size={size === 'lg' ? 18 : 16} strokeWidth={2.4} />}
      {children}
      {iconRight && <Icon name={iconRight} size={16} strokeWidth={2.4} />}
    </button>
  );
}

// Card
export function Card({ children, className = '', hover = false, style, ...rest }) {
  return (
    <div
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', ...style }}
      className={
        'border rounded-card shadow-card ' +
        (hover ? 'transition-all duration-300 hover:shadow-pop hover:-translate-y-0.5 cursor-pointer ' : '') +
        className
      }
      {...rest}
    >
      {children}
    </div>
  );
}

// Stat card
export function Stat({ label, value, sub, tone = 'default', icon }) {
  const toneColor = {
    default: 'var(--text)',
    positive: 'var(--positive)',
    negative: 'var(--negative)',
    primary: 'var(--primary)',
  }[tone];
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{ color: 'var(--muted)' }}>{label}</span>
        {icon && (
          <span className="grid place-items-center w-7 h-7 rounded-lg" style={{ background: 'var(--surface-2)', color: toneColor }}>
            <Icon name={icon} size={15} strokeWidth={2.2} />
          </span>
        )}
      </div>
      <div className="tnum text-xl sm:text-2xl font-bold leading-none whitespace-nowrap" style={{ color: toneColor }}>{value}</div>
      {sub && <div className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>{sub}</div>}
    </Card>
  );
}

// Segmented control
export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={'inline-flex p-1 rounded-pill ' + className} style={{ background: 'var(--surface-2)' }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="relative px-3.5 h-8 rounded-pill text-sm font-semibold transition-colors duration-200 whitespace-nowrap"
            style={active
              ? { background: 'var(--primary-grad)', color: '#fff' }
              : { color: 'var(--muted)' }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Modal（hooks 必須在 early return 之前）
export function Modal({ open, onClose, children, title, maxW = 'max-w-lg' }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm anim-fade" onClick={onClose} />
      <div
        className={'relative w-full border ' + maxW + ' rounded-t-2xl sm:rounded-2xl shadow-pop anim-slide max-h-[94svh] sm:max-h-[90vh] overflow-y-auto'}
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {title && (
          <div
            className="flex items-center justify-between px-5 sm:px-6 py-4 border-b sticky top-0 rounded-t-2xl z-10"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <h3 className="text-lg font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="grid place-items-center w-9 h-9 rounded-full transition-colors hover:opacity-80"
              style={{ color: 'var(--muted)' }}
            >
              <Icon name="X" size={18} strokeWidth={2.4} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// Field (form label wrapper)
export function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={'block ' + className}>
      {label && <span className="block text-sm font-semibold mb-1.5">{label}</span>}
      {children}
      {error
        ? <span className="flex items-center gap-1 text-xs mt-1.5" style={{ color: 'var(--negative)' }}>
            <Icon name="AlertCircle" size={13} />{error}
          </span>
        : hint && <span className="block text-xs mt-1.5" style={{ color: 'var(--muted)' }}>{hint}</span>}
    </label>
  );
}

// Input
export function Input({ icon, prefix, error, className = '', ...rest }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div className="relative flex items-center">
      {icon && <span className="absolute left-3 pointer-events-none" style={{ color: 'var(--muted)' }}><Icon name={icon} size={16} /></span>}
      {prefix && <span className="absolute left-3 font-medium pointer-events-none text-sm" style={{ color: 'var(--muted)' }}>{prefix}</span>}
      <input
        className={
          'w-full h-11 rounded-xl placeholder:opacity-50 border transition-all duration-200 ' +
          'focus:outline-none focus:ring-2 ' +
          (icon || prefix ? 'pl-9 ' : 'pl-3.5 ') + 'pr-3.5 ' +
          className
        }
        style={{
          background: focused ? 'var(--surface)' : 'var(--surface-2)',
          borderColor: error ? 'var(--negative)' : 'var(--border)',
          color: 'var(--text)',
          ringColor: 'var(--primary)',
        }}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        {...rest}
      />
    </div>
  );
}

// Empty state
export function Empty({ icon = 'Inbox', title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 anim-fade">
      <div className="relative mb-5">
        <div className="absolute inset-0 blur-2xl opacity-30 rounded-full" style={{ background: 'var(--primary-grad)' }} />
        <div
          className="relative grid place-items-center w-20 h-20 rounded-3xl border"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--primary)' }}
        >
          <Icon name={icon} size={34} strokeWidth={1.8} />
        </div>
      </div>
      <h3 className="text-lg font-bold mb-1.5">{title}</h3>
      <p className="text-sm max-w-xs mb-5 leading-relaxed" style={{ color: 'var(--muted)' }}>{desc}</p>
      {action}
    </div>
  );
}
