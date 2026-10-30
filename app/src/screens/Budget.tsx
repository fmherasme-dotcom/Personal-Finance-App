import { useState } from 'react';
import { Header, Money, Segmented } from '../components/ui';
import { usd } from '../lib/format';
import type { Route } from '../router';
import { useSheet } from '../sheets/SheetHost';
import { budgetColor, budgetMonth } from '../store/derive';
import { useStore } from '../store/Store';

const PALETTE = ['var(--amber)', 'var(--green)', 'var(--text)', 'var(--orange)', 'var(--faint)', 'var(--muted2)'];

export function Budget({ go }: { go: (r: Route) => void }) {
  const { data } = useStore();
  const open = useSheet();
  const [view, setView] = useState<'cat' | 'mem'>('cat');
  const bm = budgetMonth(data);
  const ratio = bm.budget ? bm.spent / bm.budget : 0;

  const byCat = [...bm.rows].filter(r => r.spent > 0).sort((a, b) => b.spent - a.spent);
  const catRows: [string, number][] = byCat.slice(0, 4).map(r => [r.category, r.spent]);
  const rest = byCat.slice(4).reduce((s, r) => s + r.spent, 0);
  if (rest > 0) catRows.push(['Everything else', rest]);
  const memRows: [string, number][] = [...bm.byMember.entries()].sort((a, b) => b[1] - a[1]).map(([id, v]) => [data.members.find(m => m.id === id)?.name.split(' ')[0] ?? 'Unknown', v]);
  const breakdown = view === 'cat' ? catRows : memRows;
  const total = breakdown.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="screen">
      <Header back={{ label: 'Home', onClick: () => go('home') }} title={`${bm.label} budget`} right={<span className="muted" style={{ fontSize: 14 }}>{bm.daysLeft} day{bm.daysLeft === 1 ? '' : 's'} left</span>} />

      <div className="card">
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Money value={bm.spent} style={{ fontSize: 30, fontWeight: 300 }} />
          <span className="muted" style={{ fontSize: 15 }}>of {usd(bm.budget)}</span>
        </div>
        <div className="bar-track" style={{ height: 6, borderRadius: 3, marginTop: 12 }}>
          <div className="bar-fill" style={{ borderRadius: 3, background: budgetColor(ratio), width: `${Math.min(100, ratio * 100)}%` }} />
        </div>
        <div className="muted" style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, flexWrap: 'wrap' }}>
          {[['Under', 'var(--green)'], ['Near (85%+)', 'var(--orange)'], ['Over', 'var(--red)']].map(([l, c]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="legend-dot" style={{ borderRadius: 4, background: c }} />{l}</span>
          ))}
        </div>
      </div>

      <div className="section-head"><span className="eyebrow">CATEGORIES</span><button className="link-sm" onClick={() => open({ type: 'budget' })}>+ Add category</button></div>
      <div className="card list">
        {bm.rows.length === 0 && <div className="muted" style={{ padding: '14px 0', fontSize: 14 }}>No categories yet. Add one to start budgeting.</div>}
        {bm.rows.map(r => {
          const rr = r.amount ? r.spent / r.amount : r.spent > 0 ? 2 : 0;
          const c = budgetColor(rr);
          const b = data.budgets.find(x => x.id === r.id);
          return (
            <button key={r.id} className="row" style={{ padding: '13px 0', width: '100%', textAlign: 'left', display: 'block' }} onClick={() => open(b ? { type: 'budget', budget: b } : { type: 'budget' })}>
              <div className="num" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 15 }}>{r.category}</span>
                <span style={{ fontSize: 14 }}><span style={{ color: c }}>{usd(r.spent)}</span><span className="muted"> / {r.amount ? usd(r.amount) : 'no budget'}</span></span>
              </div>
              <div className="bar-track" style={{ height: 4, marginTop: 9 }}>
                <div className="bar-fill" style={{ background: c, width: `${Math.min(100, rr * 100)}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px 0', gap: 12 }}>
        <span style={{ fontSize: 18, whiteSpace: 'nowrap' }}>Spending breakdown</span>
        <Segmented size="sm" label="Break down by" options={[{ value: 'cat', label: 'Category' }, { value: 'mem', label: 'Member' }]} value={view} onChange={setView} style={{ width: 170 }} />
      </div>
      <div className="card" style={{ padding: 16 }}>
        {total === 0 ? <div className="muted" style={{ fontSize: 14 }}>No spending logged this month yet.</div> : (
          <>
            <div style={{ display: 'flex', height: 12, gap: 2, borderRadius: 6, overflow: 'hidden' }}>
              {breakdown.map(([name, v], i) => <div key={name} style={{ flex: v, background: PALETTE[i % PALETTE.length] }} />)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {breakdown.map(([name, v], i) => (
                <div key={name} className="num" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length], flex: 'none' }} />
                  <span style={{ flex: 1, fontSize: 15 }}>{name}</span>
                  <span className="muted" style={{ fontSize: 13, width: 40, textAlign: 'right' }}>{Math.round((v / total) * 100)}%</span>
                  <Money value={v} style={{ fontSize: 15, width: 72, textAlign: 'right' }} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <button className="btn-secondary big" onClick={() => open({ type: 'transaction' })}>Add a transaction</button>
    </div>
  );
}
