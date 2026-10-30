export const usd = (n: number) => (n < 0 ? '−$' : '$') + Math.round(Math.abs(n)).toLocaleString('en-US');

export const usdCents = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export const signedUsd = (n: number) => (n >= 0 ? '+' : '−') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');

export const pct = (n: number) => Math.round(n * 100) + '%';

/** "$1.24M", "$312K" */
export function usdCompact(n: number) {
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e4) return s + '$' + Math.round(a / 1e3) + 'K';
  return usd(n);
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid();

/** Parse "$1,234.50" style input. */
export const parseMoney = (s: string) => {
  const v = Number(String(s).replace(/[$,\s]/g, ''));
  return Number.isFinite(v) ? v : NaN;
};
