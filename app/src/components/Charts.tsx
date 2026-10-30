import { useId } from 'react';

interface Series { values: number[]; color: string; width?: number; opacity?: number; fill?: boolean; dot?: boolean }

/** Slim line chart drawn to one shared scale. Width is fluid; height fixed. */
export function LineChart({ series, height = 140, grid = [0.25, 0.6], pad = 0.08 }: { series: Series[]; height?: number; grid?: number[]; pad?: number }) {
  const gid = useId().replace(/:/g, '');
  const W = 318, base = height - 5;
  const all = series.flatMap(s => s.values);
  const lo0 = Math.min(...all), hi0 = Math.max(...all);
  const span = hi0 - lo0 || Math.max(1, Math.abs(hi0) * 0.1);
  const lo = lo0 - span * pad * 2, hi = hi0 + span * pad;
  const y = (v: number) => base - ((v - lo) / (hi - lo)) * (base - 10);
  const pts = (vals: number[]) => vals.map((v, i) => `${((i / Math.max(1, vals.length - 1)) * W).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible', height }} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--amber)' }} stopOpacity=".22" />
          <stop offset="1" style={{ stopColor: 'var(--amber)' }} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map(g => <line key={g} x1={0} x2={W} y1={base * g} y2={base * g} style={{ stroke: 'var(--line)' }} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />)}
      <line x1={0} x2={W} y1={base} y2={base} style={{ stroke: 'var(--line)' }} vectorEffect="non-scaling-stroke" />
      {series.map((s, i) => (
        <g key={i}>
          {s.fill && <polygon points={`0,${base} ${pts(s.values)} ${W},${base}`} fill={`url(#${gid})`} />}
          <polyline points={pts(s.values)} fill="none" style={{ stroke: s.color }} strokeOpacity={s.opacity ?? 1} strokeWidth={s.width ?? 2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </svg>
  );
}

/** Small trend line for a holding; direction follows the week's change. */
export function Spark({ seed, up }: { seed: number; up: boolean }) {
  const pts = Array.from({ length: 9 }, (_, i) => {
    const v = Math.sin(seed * 1.7 + i * 1.3) * 5 + Math.cos(seed + i * 0.7) * 3 + (up ? -i : i) * 1.1;
    return `${i * 6.5},${(12 + v * 0.8).toFixed(1)}`;
  }).join(' ');
  return (
    <svg width="52" height="24" viewBox="0 0 52 24" style={{ flex: 'none' }} aria-hidden="true">
      <polyline points={pts} fill="none" style={{ stroke: up ? 'var(--green)' : 'var(--orange)' }} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function MonthAxis({ keys, every = 1 }: { keys: string[]; every?: number }) {
  const label = (k: string, i: number) => {
    const [y, m] = k.split('-').map(Number);
    const mon = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' });
    return i === 0 || i === keys.length - 1 ? `${mon} '${String(y).slice(2)}` : mon;
  };
  return (
    <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
      {keys.map((k, i) => (i % every === 0 || i === keys.length - 1 ? <span key={k}>{every === 1 ? label(k, i).slice(0, 1) : label(k, i)}</span> : null))}
    </div>
  );
}
