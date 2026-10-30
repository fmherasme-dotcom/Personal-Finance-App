import { useState } from 'react';
import { Gauge } from '../components/Gauge';
import { Empty, Money } from '../components/ui';
import { fmtDay, fromISO } from '../lib/dates';
import { fiveYear } from '../lib/finance';
import { usd } from '../lib/format';
import type { Route } from '../router';
import { useSheet } from '../sheets/SheetHost';
import { cfg, reclaimed, wasteSummary } from '../store/derive';
import { useStore } from '../store/Store';
import type { Source, WasteItem } from '../store/types';
import { WASTE_GROUPS } from '../store/types';

type Filter = 'All' | Source;

function doneText(w: WasteItem) {
  if (w.status === 'reclaimed') return { t: `Reclaimed · ${usd(w.monthly)}/mo to ${w.destination ?? 'Savings'}`, c: 'var(--green)' };
  if (w.status === 'snoozed') return { t: `Snoozed until ${w.snoozeUntil ? fmtDay(fromISO(w.snoozeUntil)) : 'later'}`, c: 'var(--muted)' };
  return { t: 'Marked as necessary', c: 'var(--muted)' };
}

export function Waste({ go }: { go: (r: Route) => void }) {
  const { data, setWasteStatus, undoWaste, notify } = useStore();
  const open = useSheet();
  const [filter, setFilter] = useState<Filter>('All');
  const [showResolved, setShowResolved] = useState(false);
  const ws = wasteSummary(data);
  const rec = reclaimed(data);
  const rate = cfg(data).returnRate;
  const vis = ws.items.filter(i => filter === 'All' || i.source === filter);
  const resolvedCount = vis.filter(i => i.status !== 'open').length;

  if (ws.items.length === 0) {
    return (
      <div className="screen with-tabs">
        <h1 className="title">Waste Finder</h1>
        <Empty
          icon={<Gauge pct={0} size={200} thickness={6} text="$0" numSize={40} label="Potential" sub="nothing flagged yet" />}
          title="No leaks found yet"
          body="Add a few weeks of transactions and your recurring bills. Reclaim flags over-budget categories here automatically, and you can flag unused subscriptions from Bills."
        >
          <button className="btn-primary big" onClick={() => open({ type: 'transaction' })}>Add a transaction</button>
          <button className="btn-secondary big" onClick={() => go('bills')}>Add recurring bills</button>
        </Empty>
      </div>
    );
  }

  const act = async (w: WasteItem, s: 'snoozed' | 'kept') => {
    await setWasteStatus(w, s);
    notify(s === 'snoozed' ? `${w.name} snoozed for 30 days` : `${w.name} marked as necessary`);
  };

  const groups = WASTE_GROUPS.map(g => {
    const items = vis.filter(i => i.group === g && (showResolved || i.status === 'open'))
      .sort((a, b) => Number(a.status !== 'open') - Number(b.status !== 'open') || b.monthly - a.monthly);
    const openTotal = items.filter(i => i.status === 'open').reduce((s, i) => s + i.monthly, 0);
    return { g, items, openTotal };
  }).filter(x => x.items.length);

  const split = [
    { label: 'Personal', v: ws.personal, c: 'var(--text)', o: 0.75 },
    { label: 'Biz A', v: ws.bizA, c: 'var(--amber)' },
    { label: 'Biz B', v: ws.bizB, c: 'var(--orange)' },
  ];

  return (
    <div className="screen with-tabs">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title">Waste Finder</h1>
        <div style={{ textAlign: 'right' }}>
          <div className="eyebrow" style={{ fontSize: 11 }}>RECLAIMED THIS YEAR</div>
          <Money value={rec.total} className="green" style={{ fontSize: 17, display: 'block', marginTop: 2 }} />
        </div>
      </div>

      <div className="card" style={{ padding: '22px 18px 18px', boxShadow: 'var(--card-hi), inset 0 0 60px rgba(212,162,76,.05)' }}>
        <div className="eyebrow">POTENTIAL SAVINGS</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
          <span className="num amber" style={{ fontSize: 58, fontWeight: 300, letterSpacing: '-.03em', lineHeight: 1 }}>{usd(ws.total)}</span>
          <span className="muted" style={{ fontSize: 18 }}>/mo</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <div><div className="muted" style={{ fontSize: 13 }}>Per year</div><div className="num" style={{ fontSize: 20, fontWeight: 300, marginTop: 4 }}>{usd(ws.year)}</div></div>
          <div><div className="muted" style={{ fontSize: 13 }}>In 5 yrs if invested</div><div className="num amber" style={{ fontSize: 20, fontWeight: 300, marginTop: 4 }}>{usd(ws.five)}</div></div>
        </div>
        {ws.total > 0 && (
          <>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, marginTop: 18 }}>
              {split.filter(s => s.v > 0).map(s => <div key={s.label} style={{ flex: s.v, background: s.c, opacity: s.o }} />)}
            </div>
            <div className="num muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
              {split.map(s => <span key={s.label}>{s.label} {usd(s.v)}</span>)}
            </div>
          </>
        )}
      </div>

      <div className="chip-row" role="group" aria-label="Filter by source">
        {(['All', 'Personal', 'Business A', 'Business B'] as Filter[]).map(f => (
          <button key={f} className="chip" aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {f} <span style={{ opacity: 0.6 }}>{ws.items.filter(i => i.status === 'open' && (f === 'All' || i.source === f)).length}</span>
          </button>
        ))}
      </div>

      {groups.length === 0 && <div className="card muted" style={{ fontSize: 15 }}>Nothing open for {filter}. {resolvedCount > 0 && 'Show handled items below to see what you already dealt with.'}</div>}

      {groups.map(({ g, items, openTotal }) => (
        <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="section-head"><span className="eyebrow">{g.toUpperCase()}</span><span className="num muted" style={{ fontSize: 13 }}>{usd(openTotal)}/mo</span></div>
          {items.map(w =>
            w.status === 'open' ? (
              <div key={w.id} className="card" style={{ padding: 16, borderRadius: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{w.name}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.4 }}>{w.why}</div>
                  </div>
                  <span className="src-tag">{w.source}</span>
                </div>
                <div className="num" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 14 }}>
                  <div><div className="muted" style={{ fontSize: 12 }}>Monthly</div><div className="orange" style={{ fontSize: 17, marginTop: 3 }}>{usd(w.monthly)}</div></div>
                  <div><div className="muted" style={{ fontSize: 12 }}>Annual</div><div style={{ fontSize: 17, marginTop: 3 }}>{usd(w.monthly * 12)}</div></div>
                  <div><div className="muted" style={{ fontSize: 12 }}>5 yrs invested</div><div className="amber" style={{ fontSize: 17, marginTop: 3 }}>{usd(fiveYear(w.monthly, rate))}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn-primary" style={{ flex: 1, height: 40, borderRadius: 11, fontSize: 14 }} onClick={() => open({ type: 'reclaim', item: w })}>Reclaim</button>
                  <button className="btn-secondary sm" onClick={() => act(w, 'snoozed')}>Snooze</button>
                  <button className="btn-secondary sm" onClick={() => act(w, 'kept')}>Necessary</button>
                </div>
              </div>
            ) : (
              <div key={w.id} className="card" style={{ padding: 16, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15 }}>{w.name}</div>
                  <div style={{ fontSize: 13, marginTop: 3, color: doneText(w).c }}>{doneText(w).t}</div>
                </div>
                <button className="btn-ghost sm" onClick={async () => { await undoWaste(w); notify(`${w.name} is back on the list`); }}>Undo</button>
              </div>
            ),
          )}
        </div>
      ))}

      {resolvedCount > 0 && (
        <button className="btn-ghost" onClick={() => setShowResolved(v => !v)}>{showResolved ? 'Hide handled items' : `Show ${resolvedCount} handled item${resolvedCount > 1 ? 's' : ''}`}</button>
      )}
      <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '0 20px', lineHeight: 1.45 }}>5-year figures assume the monthly amount is invested at {Math.round(rate * 100)}% a year. Over-budget categories appear here automatically each month.</div>
    </div>
  );
}
