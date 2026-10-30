import { LineChart, MonthAxis } from '../components/Charts';
import { Header, Money } from '../components/ui';
import { usd, usdCompact } from '../lib/format';
import type { Route } from '../router';
import { useSheet } from '../sheets/SheetHost';
import { business } from '../store/derive';
import { useStore } from '../store/Store';

const NAMES = { 'Business A': 'Restoration', 'Business B': 'Cigar Brand' } as const;

export function Business({ go }: { go: (r: Route) => void }) {
  const { data } = useStore();
  const open = useSheet();
  const A = business(data, 'Business A');
  const B = business(data, 'Business B');
  const max = Math.max(A.month, B.month, 1);
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });
  const allWaste = A.wasteMonthly + B.wasteMonthly;
  const label = (src: 'Business A' | 'Business B') => data.income.find(i => i.source === src)?.label.split('·')[0].trim() || NAMES[src];

  const card = (src: 'Business A' | 'Business B', b: typeof A) => (
    <div className="card" style={{ padding: '16px 14px' }}>
      <div className="eyebrow amber" style={{ fontSize: 12 }}>{src.toUpperCase()}</div>
      <div style={{ fontSize: 16, marginTop: 3 }}>{label(src)}</div>
      <div className="muted" style={{ fontSize: 13, marginTop: 16 }}>Draws this week</div>
      <Money value={b.week} style={{ fontSize: 28, fontWeight: 300, marginTop: 2, display: 'block' }} />
      <div className="num" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Month</span><Money value={b.month} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">YTD</span><Money value={b.ytd} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Wasted</span><span className="orange">{usd(b.wasteMonthly)}/mo</span></div>
      </div>
    </div>
  );

  const bar = (src: 'Business A' | 'Business B', b: typeof A) => {
    const cents = b.month ? (b.wasteMonthly / b.month) * 100 : 0;
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, gap: 8 }}>
          <span>{label(src)}</span>
          <span style={{ color: cents >= 5 ? 'var(--orange)' : 'var(--muted)' }}>{b.month ? `${cents < 10 ? cents.toFixed(1) : Math.round(cents)}¢ wasted per $1 taken home` : 'No draws logged this month'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ height: 10, borderRadius: 5, background: 'var(--green)', width: `${Math.max(1, (b.month / max) * 100)}%` }} />
          <div style={{ height: 10, borderRadius: 5, background: 'var(--orange)', width: `${Math.max(1, (b.wasteMonthly / max) * 100)}%` }} />
        </div>
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 6 }}>
          <span className="green">{usd(b.month)} home</span><span className="orange">{usd(b.wasteMonthly)} wasted</span>
        </div>
      </div>
    );
  };

  const hasHistory = [...A.series, ...B.series].some(s => s.value > 0);

  return (
    <div className="screen with-tabs">
      <Header back={{ label: 'Home', onClick: () => go('home') }} title="Business money" />
      <div className="muted" style={{ fontSize: 15, marginTop: -8 }}>What you took home, and what leaked inside.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{card('Business A', A)}{card('Business B', B)}</div>

      <div className="card">
        <div style={{ fontSize: 18 }}>Taken home vs. wasted inside</div>
        <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>{monthName}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 18 }}>{bar('Business A', A)}{bar('Business B', B)}</div>
      </div>

      <div className="card">
        <div style={{ fontSize: 18 }}>Owner draws · 12 months</div>
        <div className="muted" style={{ display: 'flex', gap: 16, fontSize: 13, marginTop: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 2, background: 'var(--amber)' }} />{label('Business A')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 2, background: 'var(--text)', opacity: 0.7 }} />{label('Business B')}</span>
        </div>
        {hasHistory ? (
          <>
            <div style={{ position: 'relative', marginTop: 14 }}>
              <LineChart height={160} series={[{ values: A.series.map(s => s.value), color: 'var(--amber)' }, { values: B.series.map(s => s.value), color: 'var(--text)', opacity: 0.7, width: 1.5 }]} />
              <div className="muted num" style={{ position: 'absolute', right: 0, top: -4, fontSize: 12 }}>{usdCompact(Math.max(...A.series.map(s => s.value), ...B.series.map(s => s.value)))}</div>
            </div>
            <MonthAxis keys={A.series.map(s => s.key)} />
          </>
        ) : (
          <div className="muted" style={{ fontSize: 14, marginTop: 14 }}>Log owner draws as income with source Business A or B, and the trend fills in here.</div>
        )}
      </div>

      <div className="section-head"><span className="eyebrow">WASTE INSIDE THE BUSINESSES</span><span className="num orange" style={{ fontSize: 13 }}>{usd(allWaste)}/mo</span></div>
      <div className="card list" style={{ padding: '6px 16px' }}>
        {[['Business A', A], ['Business B', B]].map(([src, b]) => {
          const bb = b as typeof A;
          return (
            <div key={src as string}>
              <div className="amber" style={{ fontSize: 13, padding: '12px 0 4px' }}>{label(src as 'Business A')}</div>
              {bb.waste.length === 0 && <div className="muted row" style={{ padding: '12px 0', fontSize: 14 }}>Nothing flagged.</div>}
              {bb.waste.map(w => (
                <button key={w.id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', width: '100%', textAlign: 'left' }} onClick={() => open({ type: 'reclaim', item: w })}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15 }}>{w.name}</div><div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{w.why}</div></div>
                  <span className="num orange" style={{ fontSize: 15 }}>{usd(w.monthly)}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button className="btn-primary big" onClick={() => go('waste')}>Review business waste</button>
        <button className="btn-secondary big" onClick={() => open({ type: 'transaction', preset: { category: 'Owner draw', source: 'Business A' } })}>Log a draw</button>
      </div>
    </div>
  );
}
