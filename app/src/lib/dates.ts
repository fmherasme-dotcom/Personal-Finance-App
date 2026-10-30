export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const todayISO = () => toISO(today());

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const addMonths = (d: Date, n: number) => {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  return new Date(r.getFullYear(), r.getMonth(), Math.min(d.getDate(), last));
};

/** Monday that starts the week containing `d`. */
export const weekStart = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthShort = (m: number) => MON[m];
export const fmtDay = (d: Date) => `${MON[d.getMonth()]} ${d.getDate()}`;
export const fmtMonthYear = (d: Date) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
export const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "4 yrs 7 mos" between today and a target month. */
export function runway(target: Date, from = today()) {
  const months = Math.max(0, (target.getFullYear() - from.getFullYear()) * 12 + target.getMonth() - from.getMonth());
  const y = Math.floor(months / 12), m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} yr${y > 1 ? 's' : ''}`);
  if (m || !y) parts.push(`${m} mo${m === 1 ? '' : 's'}`);
  return { months, text: parts.join(' '), long: parts.join(' ').replace('yrs', 'years').replace('yr', 'year').replace('mos', 'months').replace(/\bmo\b/, 'month') };
}
