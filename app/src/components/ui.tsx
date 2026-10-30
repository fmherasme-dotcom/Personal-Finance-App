import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { initials, usd } from '../lib/format';
import { usePrefs } from '../store/prefs';
import { BackIcon } from './Icons';

/** A dollar figure that respects "Hide balances". Tap to reveal for 30 seconds. */
export function Money({ value, format = usd, style, className }: { value: number; format?: (n: number) => string; style?: CSSProperties; className?: string }) {
  const { prefs, revealed, reveal } = usePrefs();
  const hidden = prefs.hideBalances && !revealed;
  if (hidden) {
    return (
      <span className={'num ' + (className ?? '')} style={{ ...style, cursor: 'pointer' }} onClick={reveal} role="button" tabIndex={0} aria-label="Hidden balance, tap to show" onKeyDown={e => e.key === 'Enter' && reveal()}>
        •••••
      </span>
    );
  }
  return <span className={'num ' + (className ?? '')} style={style}>{format(value)}</span>;
}

export function Header({ title, sub, right, back }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; back?: { label: string; onClick: () => void } }) {
  return (
    <>
      {back && <button className="back" onClick={back.onClick}><BackIcon />{back.label}</button>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          {sub && <div className="muted" style={{ fontSize: 14 }}>{sub}</div>}
          <h1 className="title">{title}</h1>
        </div>
        {right}
      </div>
    </>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label, style, size = 'md' }: { options: readonly T[] | { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; style?: CSSProperties; size?: 'sm' | 'md' }) {
  const opts = (options as (T | { value: T; label: string })[]).map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div className={'segmented ' + size} role="group" aria-label={label} style={{ gridTemplateColumns: `repeat(${opts.length}, 1fr)`, ...style }}>
      {opts.map(o => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="toggle" onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export function Tag({ bg, color, children }: { bg: string; color: string; children: ReactNode }) {
  return <span className="tag" style={{ background: bg, color }}>{children}</span>;
}

export function Avatar({ name, size = 40, active }: { name: string; size?: number; active?: boolean }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34), ...(active ? { boxShadow: 'inset 0 0 0 1.5px var(--amber)', color: 'var(--amber)' } : {}) }}
    >
      {initials(name)}
    </span>
  );
}

/** Bottom sheet dialog. Closes on backdrop tap or Escape. */
export function Sheet({ open, onClose, title, eyebrow, children }: { open: boolean; onClose: () => void; title?: ReactNode; eyebrow?: ReactNode; children: ReactNode }) {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={title ? id : undefined} onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            {eyebrow && <div className="eyebrow amber">{eyebrow}</div>}
            {title && <div id={id} style={{ fontSize: 22, marginTop: eyebrow ? 6 : 0, letterSpacing: '-.01em' }}>{title}</div>}
          </div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/** A destructive button that asks for a second tap before acting. */
export function ConfirmButton({ children, confirmText = 'Tap again to confirm', onConfirm, className = 'btn-danger', style }: { children: ReactNode; confirmText?: string; onConfirm: () => void; className?: string; style?: CSSProperties }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={className} style={style} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirmText : children}
    </button>
  );
}

export function Empty({ icon, title, body, children }: { icon?: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 14px 0' }}>
      {icon}
      <div style={{ fontSize: 22, marginTop: 24 }}>{title}</div>
      <div className="muted" style={{ fontSize: 15, marginTop: 10, lineHeight: 1.5, textWrap: 'pretty' as never }}>{body}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 28 }}>{children}</div>
    </div>
  );
}

export function SectionHead({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-head">
      <span className="eyebrow">{children}</span>
      {right}
    </div>
  );
}

export function Row({ label, value, onClick, border = true }: { label: ReactNode; value?: ReactNode; onClick?: () => void; border?: boolean }) {
  const content = (
    <>
      <span>{label}</span>
      <span className="muted" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>{value}{onClick && ' ›'}</span>
    </>
  );
  return onClick ? (
    <button type="button" className={'list-row' + (border ? ' row' : '')} onClick={onClick}>{content}</button>
  ) : (
    <div className={'list-row' + (border ? ' row' : '')}>{content}</div>
  );
}
