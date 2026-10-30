import { useEffect, useId, useState } from 'react';

interface GaugeProps {
  /** Fill fraction, 0–1. */
  pct: number;
  size?: number;
  thickness?: number;
  color?: string;
  /** Number that counts up with the sweep. Ignored when `text` is set. */
  num?: number;
  prefix?: string;
  text?: string;
  label?: string;
  sub?: string;
  subColor?: string;
  numSize?: number;
  subSize?: number;
  duration?: number;
  delay?: number;
  ticks?: boolean;
  gap?: number;
  padTop?: number;
  /** Mask the figure (Hide balances). */
  hidden?: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Sweep progress 0→1 with ease-out cubic, like a needle settling. */
function useSweep(duration: number, delay: number) {
  const [p, setP] = useState(() => (prefersReducedMotion() ? 1 : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / duration));
      setP(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [duration, delay]);
  return p;
}

const R = 84;
const CIRC = 2 * Math.PI * R;
const ARC = CIRC * 0.75; // 270° dial

export function Gauge({
  pct,
  size = 220,
  thickness = 8,
  color = 'var(--amber)',
  num,
  prefix = '',
  text,
  label,
  sub,
  subColor = 'var(--muted)',
  numSize = Math.round(size * 0.16),
  subSize = 14,
  duration = 1600,
  delay = 150,
  ticks: showTicks = true,
  gap = 10,
  padTop = 6,
  hidden = false,
}: GaugeProps) {
  const fid = useId().replace(/:/g, '');
  const p = useSweep(duration, delay);
  const cur = Math.max(0, Math.min(1, pct)) * p;
  const on = cur > 0.002;

  const ticks = [];
  for (let i = 0, n = 36; showTicks && i <= n; i++) {
    const a = ((135 + (270 * i) / n) * Math.PI) / 180;
    const major = i % 6 === 0;
    const r2 = major ? 99 : 96;
    const lit = on && i / n <= cur + 0.001;
    ticks.push(
      <line
        key={i}
        x1={100 + 93 * Math.cos(a)}
        y1={100 + 93 * Math.sin(a)}
        x2={100 + r2 * Math.cos(a)}
        y2={100 + r2 * Math.sin(a)}
        style={{ stroke: lit ? color : major ? 'var(--tick)' : 'var(--line)', opacity: lit && !major ? 0.53 : 1 }}
        strokeWidth={major ? 1.6 : 1}
        strokeLinecap="round"
      />,
    );
  }

  const ea = ((135 + 270 * cur) * Math.PI) / 180;
  const display = hidden ? '•••••' : text ?? prefix + Math.round((num ?? 0) * p).toLocaleString('en-US');
  const arc = { cx: 100, cy: 100, r: R, fill: 'none', strokeLinecap: 'round' as const, transform: 'rotate(135 100 100)' };

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }} role="img" aria-label={[label, hidden ? 'hidden' : text ?? `${prefix}${(num ?? 0).toLocaleString('en-US')}`, sub].filter(Boolean).join(', ')}>
      <svg viewBox="0 0 200 200" width={size} height={size} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
        <defs>
          <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {ticks}
        <circle {...arc} style={{ stroke: 'var(--track)' }} strokeWidth={thickness} strokeDasharray={`${ARC} ${CIRC}`} />
        {on && (
          <>
            <circle {...arc} style={{ stroke: color }} strokeWidth={thickness * 2.2} strokeDasharray={`${ARC * cur} ${CIRC}`} opacity={0.35} filter={`url(#${fid})`} />
            <circle {...arc} style={{ stroke: color }} strokeWidth={thickness} strokeDasharray={`${ARC * cur} ${CIRC}`} />
            <circle cx={100 + R * Math.cos(ea)} cy={100 + R * Math.sin(ea)} r={thickness * 0.32} style={{ fill: 'var(--gauge-dot)' }} />
          </>
        )}
      </svg>
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap, textAlign: 'center', paddingTop: padTop }}
      >
        {label && <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500 }}>{label}</div>}
        <div className="num" style={{ fontSize: numSize, fontWeight: 300, letterSpacing: '-.02em', lineHeight: 1, whiteSpace: 'nowrap' }}>{display}</div>
        {sub && <div className="num" style={{ fontSize: subSize, color: subColor, whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
    </div>
  );
}
