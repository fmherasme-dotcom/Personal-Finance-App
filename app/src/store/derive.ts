// Pure calculations over the stored data. Everything the screens show comes from here.
import { addDays, daysBetween, fromISO, monthKey, toISO, today, weekStart } from '../lib/dates';
import { fiveYear, monthsToGoal, perMonth } from '../lib/finance';
import type { Account, Bill, Data, Destination, Holding, Source, Transaction, WasteItem } from './types';
import { DEFAULT_CONFIG, DESTINATIONS } from './types';

export const cfg = (d: Data) => d.config ?? DEFAULT_CONFIG;

export const holdingValue = (h: Holding) => h.qty * h.price;
export const holdingChange = (h: Holding) => (h.prevPrice ? (h.price - h.prevPrice) / h.prevPrice : 0);

export function portfolio(d: Data) {
  const total = d.holdings.reduce((s, h) => s + holdingValue(h), 0);
  const prev = d.holdings.reduce((s, h) => s + h.qty * (h.prevPrice || h.price), 0);
  return { total, change: total - prev, changePct: prev ? (total - prev) / prev : 0 };
}

export const accountValue = (a: Account, d: Data) => (a.linked === 'portfolio' ? portfolio(d).total : a.value);

const byOrder = <T extends { order?: number; name?: string }>(a: T, b: T) => (a.order ?? 99) - (b.order ?? 99) || (a.name ?? '').localeCompare(b.name ?? '');

export function netWorth(d: Data) {
  const stored = d.accounts.filter(a => a.kind === 'asset').sort(byOrder);
  // Holdings always count: if no account is linked to them, show them as their own line.
  const assets: Account[] = stored.some(a => a.linked) || !d.holdings.length
    ? stored
    : [...stored, { id: 'portfolio', name: 'Stocks & crypto', note: '', kind: 'asset', value: 0, linked: 'portfolio' }];
  const liabilities = d.accounts.filter(a => a.kind === 'liability').sort(byOrder);
  const totalAssets = assets.reduce((s, a) => s + accountValue(a, d), 0);
  const totalLiabs = liabilities.reduce((s, a) => s + accountValue(a, d), 0);
  const value = totalAssets - totalLiabs;
  const snaps = [...d.history.netWorth].sort((a, b) => a.date.localeCompare(b.date));
  const ws = toISO(weekStart(today()));
  const before = [...snaps].reverse().find(s => s.date < ws);
  const weekChange = before ? value - before.value : 0;
  // 12-month trend: last snapshot of each month, current month = live value.
  const months: { key: string; value: number | null }[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(today().getFullYear(), today().getMonth() - i, 1);
    const key = monthKey(m);
    const last = [...snaps].reverse().find(s => s.date.startsWith(key));
    months.push({ key, value: i === 0 ? value : last?.value ?? null });
  }
  // Fill gaps with the previous known value so the line stays continuous.
  let lastKnown: number | null = null;
  const trend = months.map(m => {
    if (m.value != null) lastKnown = m.value;
    return { key: m.key, value: m.value ?? lastKnown };
  });
  const firstKnown = trend.find(t => t.value != null)?.value ?? value;
  const series = trend.map(t => t.value ?? firstKnown);
  return { assets, liabilities, totalAssets, totalLiabs, value, weekChange, trend: series, trendKeys: trend.map(t => t.key), yearChange: value - series[0] };
}

export function weekRange(d = today()) {
  const start = weekStart(d);
  return { start, end: addDays(start, 6), startISO: toISO(start), endISO: toISO(addDays(start, 6)) };
}

const inRange = (t: Transaction, a: string, b: string) => t.date >= a && t.date <= b;

/** Money in / out for a week; `personId` narrows to one member (draws always count for owners). */
export function weekFlow(d: Data, personId: string | null, ref = today()) {
  const { startISO, endISO } = weekRange(ref);
  const tx = d.transactions.filter(t => inRange(t, startISO, endISO) && (!personId || t.personId === personId));
  const inc = tx.filter(t => t.type === 'income');
  const out = tx.filter(t => t.type === 'expense');
  const draws = inc.filter(t => t.source !== 'Personal');
  const sum = (a: Transaction[]) => a.reduce((s, t) => s + t.amount, 0);
  // Average weekly spending over the four weeks before this one.
  const prev = [1, 2, 3, 4].map(w => {
    const r = weekRange(addDays(ref, -7 * w));
    return sum(d.transactions.filter(t => t.type === 'expense' && inRange(t, r.startISO, r.endISO) && (!personId || t.personId === personId)));
  });
  const prevWeeks = prev.filter(v => v > 0);
  const avgOut = prevWeeks.length ? prevWeeks.reduce((a, b) => a + b, 0) / prevWeeks.length : 0;
  return {
    in: sum(inc), out: sum(out), draws: sum(draws),
    drawsA: sum(draws.filter(t => t.source === 'Business A')), drawsB: sum(draws.filter(t => t.source === 'Business B')),
    avgOut, vsAvg: avgOut ? (sum(out) - avgOut) / avgOut : 0,
  };
}

export function budgetMonth(d: Data, ref = today()) {
  const key = monthKey(ref);
  const tx = d.transactions.filter(t => t.type === 'expense' && t.date.startsWith(key) && t.source === 'Personal');
  const spentBy = new Map<string, number>();
  tx.forEach(t => spentBy.set(t.category, (spentBy.get(t.category) ?? 0) + t.amount));
  const rows = [...d.budgets]
    .sort((a, b) => b.amount - a.amount)
    .map(b => ({ ...b, spent: spentBy.get(b.category) ?? 0 }));
  const unbudgeted = [...spentBy.entries()].filter(([c]) => !d.budgets.some(b => b.category === c)).map(([category, spent]) => ({ id: 'x-' + category, category, amount: 0, spent }));
  const all = [...rows, ...unbudgeted];
  const spent = tx.reduce((s, t) => s + t.amount, 0);
  const budget = d.budgets.reduce((s, b) => s + b.amount, 0);
  const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const byMember = new Map<string, number>();
  tx.forEach(t => byMember.set(t.personId, (byMember.get(t.personId) ?? 0) + t.amount));
  return { key, rows: all, spent, budget, daysLeft: lastDay - ref.getDate(), byMember, label: ref.toLocaleString('en-US', { month: 'long' }) };
}

export const budgetColor = (ratio: number) => (ratio > 1 ? 'var(--red)' : ratio >= 0.85 ? 'var(--orange)' : 'var(--green)');

/** Stored waste items plus live over-budget categories; expired snoozes reopen. */
export function wasteItems(d: Data): WasteItem[] {
  const t = toISO(today());
  const stored = d.waste.map(w => (w.status === 'snoozed' && w.snoozeUntil && w.snoozeUntil <= t ? { ...w, status: 'open' as const } : w));
  const bm = budgetMonth(d);
  const derived: WasteItem[] = bm.rows
    .filter(r => r.amount > 0 && r.spent > r.amount)
    .map(r => ({
      id: `budget-${r.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${bm.key}`,
      group: 'Over-budget Categories' as const,
      name: r.category,
      why: `$${Math.round(r.spent).toLocaleString('en-US')} spent of a $${Math.round(r.amount).toLocaleString('en-US')} budget`,
      source: 'Personal' as Source,
      monthly: Math.round(r.spent - r.amount),
      status: 'open' as const,
      derived: true,
    }))
    .filter(x => !stored.some(s => s.id === x.id));
  return [...stored, ...derived];
}

export function wasteSummary(d: Data) {
  const items = wasteItems(d);
  const open = items.filter(i => i.status === 'open');
  const total = open.reduce((s, i) => s + i.monthly, 0);
  const by = (src: Source) => open.filter(i => i.source === src).reduce((s, i) => s + i.monthly, 0);
  return {
    items, open, total, year: total * 12, five: fiveYear(total, cfg(d).returnRate),
    personal: by('Personal'), bizA: by('Business A'), bizB: by('Business B'),
    weekly: (total * 12) / 52,
  };
}

/** Money redirected this year: prior amount from setup plus each reclaimed item's monthly amount for every month since. */
export function reclaimed(d: Data) {
  const c = cfg(d);
  const year = today().getFullYear();
  const byDest: Record<Destination, number> = { Savings: 0, Investments: 0, 'Retirement goal': 0 };
  if (c.reclaimedBaseYear === year) DESTINATIONS.forEach(k => (byDest[k] += c.reclaimedBase?.[k] ?? 0));
  d.waste.filter(w => w.status === 'reclaimed' && w.resolvedAt).forEach(w => {
    const from = fromISO(w.resolvedAt!);
    const start = from.getFullYear() < year ? new Date(year, 0, 1) : from;
    const months = (today().getFullYear() - start.getFullYear()) * 12 + today().getMonth() - start.getMonth() + 1;
    byDest[w.destination ?? 'Savings'] += w.monthly * Math.max(1, months);
  });
  const total = DESTINATIONS.reduce((s, k) => s + byDest[k], 0);
  const monthlyRedirect = d.waste.filter(w => w.status === 'reclaimed').reduce((s, w) => s + w.monthly, 0);
  return { byDest, total, monthlyRedirect };
}

export type BillStatus = 'Paid' | 'Due soon' | 'Overdue' | 'Possibly unused' | 'Upcoming';

export function billStatus(b: Bill, ref = today()): BillStatus {
  const due = fromISO(b.due);
  const days = daysBetween(ref, due);
  if (days < 0) return 'Overdue';
  if (b.kind === 'subscription' && b.lastUsed && daysBetween(fromISO(b.lastUsed), ref) > 30) return 'Possibly unused';
  if (b.lastPaid && daysBetween(fromISO(b.lastPaid), ref) <= 10) return 'Paid';
  if (days <= 7) return 'Due soon';
  return 'Upcoming';
}

export const STATUS_STYLE: Record<BillStatus, [string, string]> = {
  Paid: ['rgba(63,163,122,.15)', 'var(--green)'],
  'Due soon': ['rgba(212,162,76,.14)', 'var(--amber)'],
  Overdue: ['rgba(217,83,79,.16)', 'var(--red)'],
  'Possibly unused': ['rgba(224,112,58,.15)', 'var(--orange)'],
  Upcoming: ['var(--s2)', 'var(--muted)'],
};

export function billsSummary(d: Data) {
  const monthly = d.bills.reduce((s, b) => s + perMonth(b.amount, b.freq), 0);
  const t = toISO(today()), wk = toISO(addDays(today(), 7));
  const next7 = d.bills.filter(b => b.due <= wk && billStatus(b) !== 'Paid').sort((a, b) => a.due.localeCompare(b.due));
  return { monthly, annual: monthly * 12, next7, next7Total: next7.reduce((s, b) => s + b.amount, 0), overdue: d.bills.filter(b => b.due < t).length };
}

export function business(d: Data, src: 'Business A' | 'Business B') {
  const draws = d.transactions.filter(t => t.type === 'income' && t.source === src);
  const hist = src === 'Business A' ? d.history.drawsA : d.history.drawsB;
  const { startISO, endISO } = weekRange();
  const mk = monthKey(today());
  const year = String(today().getFullYear());
  const sum = (a: Transaction[]) => a.reduce((s, t) => s + t.amount, 0);
  const monthTotal = (key: string) => (hist[key] ?? 0) + sum(draws.filter(t => t.date.startsWith(key)));
  const ytd = Object.entries(hist).filter(([k]) => k.startsWith(year)).reduce((s, [, v]) => s + v, 0) + sum(draws.filter(t => t.date.startsWith(year)));
  const series = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(today().getFullYear(), today().getMonth() - 11 + i, 1);
    return { key: monthKey(m), value: monthTotal(monthKey(m)) };
  });
  const waste = wasteItems(d).filter(w => w.source === src && w.status === 'open');
  return {
    week: sum(draws.filter(t => t.date >= startISO && t.date <= endISO)),
    month: monthTotal(mk), ytd, series, waste, wasteMonthly: waste.reduce((s, w) => s + w.monthly, 0),
  };
}

export function retirement(d: Data) {
  const c = cfg(d);
  const nw = netWorth(d).value;
  const target = new Date(c.goal.year, c.goal.month, 1);
  const funded = Math.max(0, nw / c.goal.number);
  const supported = Math.min(1, funded) * c.goal.monthlyIncome;
  const baseMonths = monthsToGoal(nw, c.monthlyContribution, c.goal.number, c.returnRate);
  const projDate = Number.isFinite(baseMonths) ? new Date(today().getFullYear(), today().getMonth() + baseMonths, 1) : null;
  return { c, nw, target, funded, supported, gap: Math.max(0, c.goal.monthlyIncome - supported), baseMonths, projDate };
}

export function nextReviewDate(day: string) {
  const idx = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(day);
  const t = today();
  const diff = (idx - t.getDay() + 7) % 7;
  return addDays(t, diff === 0 ? 7 : diff);
}
