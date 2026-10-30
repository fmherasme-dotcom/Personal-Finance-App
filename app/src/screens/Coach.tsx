import { useEffect, useRef, useState } from 'react';
import { Gauge } from '../components/Gauge';
import { CoachIcon, SendIcon } from '../components/Icons';
import { Money } from '../components/ui';
import { fmtDay, fmtMonthYear, fromISO, runway, today } from '../lib/dates';
import { fiveYear, monthsToGoal } from '../lib/finance';
import { signedUsd, usd } from '../lib/format';
import { useSheet } from '../sheets/SheetHost';
import { billStatus, budgetMonth, business, cfg, netWorth, nextReviewDate, reclaimed, retirement, wasteSummary, weekFlow, weekRange } from '../store/derive';
import { usePrefs } from '../store/prefs';
import { useStore } from '../store/Store';

type Turn = { role: 'user' | 'assistant'; content: string };
type SampleFn = ((input: string | Turn[], opts?: { onText?: (u: { text: string }) => void; signal?: AbortSignal; cache?: boolean }) => Promise<{ text: string }>) | null;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

function load<T>(k: string, d: T): T {
  try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; }
}
function store(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ }
}

export function Coach() {
  const { data, markReviewed, notify } = useStore();
  const { prefs } = usePrefs();
  const open = useSheet();
  const c = cfg(data);
  const wk = weekRange();
  const me = data.members.find(m => m.id === prefs.meId) ?? data.members.find(m => m.role === 'Owner') ?? data.members[0];
  const flow = weekFlow(data, null);
  const nw = netWorth(data);
  const ws = wasteSummary(data);
  const rec = reclaimed(data);
  const ret = retirement(data);
  const bm = budgetMonth(data);
  const A = business(data, 'Business A');
  const kept = flow.in - flow.out;
  const reviewed = data.reviews.find(r => r.id === wk.startISO);
  const skipKey = 'reclaim-coach-skip-' + wk.startISO;
  const [skipped, setSkipped] = useState<string | null>(() => load(skipKey, null));

  const openItems = [...ws.open].sort((a, b) => b.monthly - a.monthly);
  const move = openItems.find(w => w.id !== skipped);
  const topSource = (['Personal', 'Business A', 'Business B'] as const).map(s => ({ s, v: ws.open.filter(w => w.source === s).reduce((a, w) => a + w.monthly, 0) })).sort((a, b) => b.v - a.v)[0];
  const overdue = data.bills.filter(b => billStatus(b) === 'Overdue');
  const under = bm.rows.filter(r => r.amount > 0 && r.spent < r.amount * 0.85).sort((a, b) => (b.amount - b.spent) - (a.amount - a.spent));
  const over = bm.rows.filter(r => r.amount > 0 && r.spent > r.amount).sort((a, b) => (b.spent - b.amount) - (a.spent - a.amount));
  const moveSooner = move && Number.isFinite(ret.baseMonths) ? ret.baseMonths - monthsToGoal(ret.nw, c.monthlyContribution + move.monthly, c.goal.number, c.returnRate) : 0;
  const run = runway(ret.target);

  const summary =
    `You brought in ${usd(flow.in)} and spent ${usd(flow.out)}, so ${kept >= 0 ? `${usd(kept)} stayed with the household` : `you ran ${usd(-kept)} short`}. ` +
    (nw.weekChange ? `Net worth ${nw.weekChange > 0 ? 'rose' : 'fell'} ${usd(Math.abs(nw.weekChange))}. ` : 'Net worth held steady. ') +
    (ws.total > 0 ? `I see ${usd(ws.weekly)} of waste this week, and most of it sits in ${topSource.s === 'Personal' ? 'household spending' : topSource.s === 'Business A' ? 'the restoration business' : "the cigar brand"}.` : 'No open leaks right now.');

  const well: string[] = [];
  under.slice(0, 1).forEach(r => well.push(`${r.category} is ${usd(r.amount - r.spent)} under budget for ${bm.label}.`));
  if (rec.monthlyRedirect > 0) well.push(`You're redirecting ${usd(rec.monthlyRedirect)} a month from reclaimed waste, ${usd(rec.total)} so far this year.`);
  if (A.week > 0) well.push(`The restoration business paid you ${usd(A.week)} this week.`);
  if (nw.weekChange > 0) well.push(`Net worth is up ${usd(nw.weekChange)} since last week.`);
  if (!well.length) well.push('You showed up for the weekly review. That habit is what makes the rest work.');

  const leaks: { t: string; red?: boolean }[] = [];
  openItems.slice(0, 2).forEach(w => leaks.push({ t: `${w.name} (${w.source}): ${w.why.charAt(0).toLowerCase() + w.why.slice(1)}. That's ${usd(w.monthly)} a month.` }));
  over.filter(r => !openItems.slice(0, 2).some(w => w.name === r.category)).slice(0, 1).forEach(r => leaks.push({ t: `${r.category} is ${usd(r.spent - r.amount)} over budget with ${bm.daysLeft} day${bm.daysLeft === 1 ? '' : 's'} left in the month.` }));
  overdue.slice(0, 2).forEach(b => leaks.push({ t: `${b.name} (${usd(b.amount)}) was due ${fmtDay(fromISO(b.due))}. Paying it now avoids a late fee.`, red: true }));

  // ---- follow-up chat (runs on the viewer's Claude account when available) ----
  const chatKey = 'reclaim-coach-chat-' + wk.startISO;
  const [turns, setTurns] = useState<Turn[]>(() => load(chatKey, []));
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<SampleFn | undefined>(undefined);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    if (!window.claude?.use) { setSample(null); return; }
    window.claude.use('sample').then(s => alive && setSample((s as SampleFn) ?? null)).catch(() => alive && setSample(null));
    return () => { alive = false; ctl.current?.abort(); };
  }, []);

  const context = () => JSON.stringify({
    today: today().toDateString(),
    week: { in: flow.in, out: flow.out, ownerDraws: flow.draws, kept },
    netWorth: { total: nw.value, weekChange: nw.weekChange, assets: nw.totalAssets, liabilities: nw.totalLiabs, yearChange: nw.yearChange },
    waste: { openMonthly: ws.total, items: openItems.map(w => ({ name: w.name, source: w.source, monthly: w.monthly, why: w.why, group: w.group })) },
    reclaimedThisYear: rec.total,
    budget: { month: bm.label, spent: bm.spent, budget: bm.budget, daysLeft: bm.daysLeft, categories: bm.rows.map(r => ({ category: r.category, spent: Math.round(r.spent), budget: r.amount })) },
    bills: data.bills.map(b => ({ name: b.name, amount: b.amount, freq: b.freq, due: b.due, status: billStatus(b) })),
    retirement: { targetDate: fmtMonthYear(ret.target), targetMonthlyIncome: c.goal.monthlyIncome, number: c.goal.number, funded: Math.round(ret.funded * 100) + '%', investsPerMonth: c.monthlyContribution, expectedReturn: c.returnRate, projectedDate: ret.projDate ? fmtMonthYear(ret.projDate) : null },
    businesses: { restorationDrawsMonth: A.month, cigarDrawsMonth: business(data, 'Business B').month },
  });

  const ask = async (text: string) => {
    if (!sample || !text.trim() || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: text.trim() }];
    setTurns([...next, { role: 'assistant', content: '' }]);
    setQ('');
    setBusy(true);
    ctl.current = new AbortController();
    const rules =
      `You are the weekly money coach inside Reclaim, a private household finance app for ${me?.name ?? 'a business owner'}, ` +
      'who owns a restoration company (Business A) and a premium cigar brand (Business B) and plans to semi-retire. ' +
      'Tone: warm, direct, encouraging, like a trusted advisor; never preachy. Answer in 2–5 short sentences of plain prose, no headings or lists unless asked. ' +
      'Use only the figures in the data below; if something is not in the data, say so and suggest what to log. Round to whole dollars. ' +
      'Investments compound at the expectedReturn given. You do not move money; suggest actions in the app (Reclaim, Snooze, Flag as waste, Update value).\n\nDATA:\n' + context();
    try {
      const { text: answer } = await sample([{ role: 'user', content: rules }, { role: 'assistant', content: 'Understood. Ask me anything about this week.' }, ...next.slice(-10)], {
        cache: false, signal: ctl.current.signal,
        onText: ({ text: t }) => setTurns([...next, { role: 'assistant', content: t }]),
      });
      const done: Turn[] = [...next, { role: 'assistant', content: answer }];
      setTurns(done);
      store(chatKey, done);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'cancelled') { setTurns(next.slice(0, -1)); }
      else {
        setTurns(next.slice(0, -1));
        setQ(text);
        notify(code === 'not_granted' ? 'The coach needs permission to use Claude.' : code === 'rate_limited' ? 'The coach is busy. Try again in a minute.' : "The coach couldn't answer. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const suggestions = [
    move ? `What if I only cut ${move.name.toLowerCase()} in half?` : 'Where could I save next?',
    over[0] ? `Why is ${over[0].category.toLowerCase()} over budget?` : 'How am I doing against my budget?',
    'Am I on track for semi-retirement?',
  ];

  return (
    <div className="screen with-tabs coach">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="amber"><CoachIcon /><span className="eyebrow amber">WEEKLY BRIEFING · {fmtDay(wk.start).toUpperCase()} – {fmtDay(wk.end).toUpperCase()}</span></div>
      <div style={{ fontSize: 30, letterSpacing: '-.02em', lineHeight: 1.15 }}>{greeting()}, {me?.name.split(' ')[0] ?? 'there'}.</div>
      <div className="muted" style={{ fontSize: 14, marginTop: -6 }}>3 min read · Reclaimed this year <Money value={rec.total} className="green" /></div>

      <div className="brief-label">01 · YOUR WEEK IN 30 SECONDS</div>
      <div style={{ fontSize: 19, lineHeight: 1.5 }}>{summary}</div>
      <div className="num" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        <div className="card mini"><div className="muted" style={{ fontSize: 12 }}>Kept</div><Money value={kept} format={usd} className={kept >= 0 ? 'green' : 'orange'} style={{ fontSize: 19, fontWeight: 300, marginTop: 4, display: 'block' }} /></div>
        <div className="card mini"><div className="muted" style={{ fontSize: 12 }}>Net worth</div><Money value={nw.weekChange} format={signedUsd} style={{ fontSize: 19, fontWeight: 300, marginTop: 4, display: 'block' }} /></div>
        <div className="card mini"><div className="muted" style={{ fontSize: 12 }}>Waste</div><div className="orange" style={{ fontSize: 19, fontWeight: 300, marginTop: 4 }}>{usd(ws.weekly)}</div></div>
      </div>

      <div className="brief-rule" />
      <div className="brief-label">02 · WHAT WENT WELL</div>
      <ul className="bullets">{well.slice(0, 3).map(t => <li key={t}><span className="dot" style={{ background: 'var(--green)' }} />{t}</li>)}</ul>

      <div className="brief-rule" />
      <div className="brief-label">03 · WHERE MONEY LEAKED</div>
      <ul className="bullets">
        {leaks.length === 0 && <li><span className="dot" style={{ background: 'var(--green)' }} />Nothing leaked that I can see. Keep logging and I'll keep watching.</li>}
        {leaks.slice(0, 3).map(l => <li key={l.t}><span className="dot" style={{ background: l.red ? 'var(--red)' : 'var(--orange)' }} />{l.t}</li>)}
      </ul>

      <div className="brief-rule" />
      <div className="brief-label amber">04 · ONE MOVE TO MAKE THIS WEEK</div>
      {move ? (
        <div className="card feature" style={{ padding: '20px 18px', boxShadow: 'inset 0 0 0 1px rgba(212,162,76,.35), inset 0 0 50px rgba(212,162,76,.05)' }}>
          <div style={{ fontSize: 20, lineHeight: 1.4 }}>{move.group === 'Over-budget Categories' ? `Rein in ${move.name.toLowerCase()} and` : `Cut ${move.name.toLowerCase()} and`} send the {usd(move.monthly)} a month to your semi-retirement fund.</div>
          <div className="num" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div><div className="muted" style={{ fontSize: 13 }}>In 5 years</div><div className="amber" style={{ fontSize: 24, fontWeight: 300, marginTop: 4 }}>+{usd(fiveYear(move.monthly, c.returnRate))}</div></div>
            <div><div className="muted" style={{ fontSize: 13 }}>Goal moves</div><div className="green" style={{ fontSize: 24, fontWeight: 300, marginTop: 4 }}>{moveSooner > 0 ? `${moveSooner} mo${moveSooner > 1 ? 's' : ''} sooner` : 'a little sooner'}</div></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn-primary" style={{ flex: 1, height: 48, borderRadius: 13 }} onClick={() => open({ type: 'reclaim', item: move })}>Reclaim {usd(move.monthly)}/mo</button>
            <button className="btn-secondary" style={{ height: 48, padding: '0 16px', borderRadius: 13 }} onClick={() => { setSkipped(move.id); store(skipKey, move.id); }}>Not this week</button>
          </div>
        </div>
      ) : <div className="card muted" style={{ fontSize: 15 }}>No open leaks to act on. Consider raising what you invest each month in Retirement.</div>}

      <div className="brief-rule" />
      <div className="brief-label">05 · PROGRESS TOWARD SEMI-RETIREMENT</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Gauge pct={ret.funded} size={110} thickness={12} ticks={false} text={`${Math.round(ret.funded * 100)}%`} numSize={24} gap={0} padTop={4} />
        <div style={{ fontSize: 16, lineHeight: 1.5, flex: 1 }}>
          {run.long} to go until {fmtMonthYear(ret.target)}.{' '}
          {ret.projDate ? (ret.projDate <= ret.target ? `You're on pace to reach your number by ${fmtMonthYear(ret.projDate)}.` : `At today's pace you reach your number in ${fmtMonthYear(ret.projDate)}, so every reclaimed dollar matters.`) : ''}
        </div>
      </div>

      <div className="brief-rule" />
      <div style={{ fontSize: 18 }}>Ask a follow-up</div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
        {sample === null && <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>Follow-up questions work when this page is opened in Claude. The briefing above is always available.</div>}
        {turns.map((t, i) => (
          t.role === 'user'
            ? <div key={i} className="bubble-user">{t.content}</div>
            : <div key={i} className="bubble-coach">{t.content || <span className="muted">Thinking…</span>}</div>
        ))}
        {sample !== null && (
          <>
            {turns.length === 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {suggestions.map(s => <button key={s} className="suggest" onClick={() => ask(s)} disabled={!sample || busy}>{s}</button>)}
              </div>
            )}
            <form className="ask-box" onSubmit={e => { e.preventDefault(); ask(q); }}>
              <input id="coach-q" value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about this week" aria-label="Ask the coach" disabled={!sample} />
              {busy
                ? <button type="button" className="send" aria-label="Stop" onClick={() => ctl.current?.abort()}>■</button>
                : <button className="send" aria-label="Send" disabled={!q.trim() || !sample}><SendIcon /></button>}
            </form>
            {turns.length > 0 && !busy && <button className="link-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { setTurns([]); store(chatKey, []); }}>Clear conversation</button>}
          </>
        )}
      </div>

      <button className={reviewed ? 'btn-done big' : 'btn-primary big'} style={{ marginTop: 12 }} onClick={async () => {
        await markReviewed(wk.startISO, !reviewed);
        if (!reviewed) notify('Weekly review complete');
      }}>{reviewed ? 'Recap reviewed ✓' : 'Mark recap reviewed'}</button>
      <div className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
        {reviewed ? `Weekly review complete. See you ${c.reviewDay}, ${fmtDay(nextReviewDate(c.reviewDay))} at ${fmtTime(c.reminderTime)}.` : "Completes this week's review"}
      </div>
    </div>
  );
}

export function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
