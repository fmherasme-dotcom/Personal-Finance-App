import { useState } from 'react';
import { Spark } from '../components/Charts';
import { GaugeIcon } from '../components/Icons';
import { Empty, Header, Money } from '../components/ui';
import { fmtDay, fromISO } from '../lib/dates';
import { pct, signedUsd, usd, usdCompact } from '../lib/format';
import type { Route } from '../router';
import { useSheet } from '../sheets/SheetHost';
import { holdingChange, holdingValue, netWorth, portfolio } from '../store/derive';
import { useStore } from '../store/Store';
import type { Holding, HoldingKind } from '../store/types';

type Filter = 'All' | 'Stocks & ETFs' | 'Crypto';
const ALLOCATION: { kind: HoldingKind; label: string; color: string; opacity?: number }[] = [
  { kind: 'etf', label: 'Index ETFs', color: 'var(--amber)' },
  { kind: 'stock', label: 'Stocks', color: 'var(--text)', opacity: 0.75 },
  { kind: 'fund', label: 'Active funds', color: 'var(--orange)' },
  { kind: 'crypto', label: 'Crypto', color: 'var(--green)' },
];
const matches = (f: Filter, h: Holding) => f === 'All' || (f === 'Crypto' ? h.kind === 'crypto' : h.kind !== 'crypto');

export function Portfolio({ go }: { go: (r: Route) => void }) {
  const { data, save, notify } = useStore();
  const open = useSheet();
  const [filter, setFilter] = useState<Filter>('All');
  const pf = portfolio(data);
  const nw = netWorth(data);
  const shown = [...data.holdings].filter(h => matches(filter, h)).sort((a, b) => holdingValue(b) - holdingValue(a));
  const shownTotal = shown.reduce((s, h) => s + holdingValue(h), 0);
  const byKind = (k: HoldingKind) => data.holdings.filter(h => h.kind === k).reduce((s, h) => s + holdingValue(h), 0);
  const leaks = data.holdings.filter(h => (h.fee ?? 0) > 0.5);
  const pricedAt = data.holdings.map(h => h.pricedAt).filter(Boolean).sort().pop();

  const sendLeak = async (h: Holding) => {
    const yearly = holdingValue(h) * ((h.fee! - 0.03) / 100);
    await save('waste', {
      id: 'fee-' + h.id, group: 'Fees & Interest', name: `${h.name} fees`,
      why: `${h.fee}% a year vs. about 0.03% for a broad index fund`, source: 'Personal',
      monthly: Math.round(yearly / 12), status: 'open',
    });
    notify(`${h.tk} fee sent to Waste Finder`);
  };

  return (
    <div className="screen with-tabs">
      <Header back={{ label: 'Net Worth', onClick: () => go('networth') }} title="Stocks & crypto" />
      {data.holdings.length === 0 ? (
        <Empty title="No holdings yet" body="Add each stock, fund or coin with its quantity and price. The total feeds the Investments line of your net worth.">
          <button className="btn-primary big" onClick={() => open({ type: 'holding' })}>Add holding</button>
        </Empty>
      ) : (
        <>
          <div className="card" style={{ padding: '20px 18px', boxShadow: 'var(--card-hi), inset 0 0 60px rgba(212,162,76,.04)' }}>
            <div className="eyebrow">{filter === 'All' ? 'PORTFOLIO VALUE' : filter.toUpperCase()}</div>
            <Money value={shownTotal} style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-.03em', marginTop: 8, lineHeight: 1, display: 'block' }} />
            <div className="num" style={{ fontSize: 15, marginTop: 8, color: pf.change >= 0 ? 'var(--green)' : 'var(--orange)' }}>
              {signedUsd(pf.change)} since last prices · {pf.changePct >= 0 ? '+' : ''}{(pf.changePct * 100).toFixed(2)}%
            </div>
            <div className="split" style={{ height: 8, marginTop: 18 }}>
              {ALLOCATION.filter(a => byKind(a.kind) > 0).map(a => <div key={a.kind} style={{ flex: byKind(a.kind), background: a.color, opacity: a.opacity }} />)}
            </div>
            <div className="num muted" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginTop: 12, fontSize: 13 }}>
              {ALLOCATION.filter(a => byKind(a.kind) > 0).map(a => (
                <span key={a.kind} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="legend-dot" style={{ background: a.color, opacity: a.opacity }} />{a.label} {pct(byKind(a.kind) / pf.total)}
                </span>
              ))}
            </div>
          </div>

          <button onClick={() => go('networth')} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, padding: '14px 16px', textAlign: 'left' }}>
            <span className="amber" style={{ display: 'flex' }}><GaugeIcon size={22} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15 }}>Counts toward net worth</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Investments line · {nw.value > 0 ? pct(pf.total / nw.value) : '—'} of net worth</div>
            </div>
            <Money value={nw.value} format={n => usdCompact(n) + ' ›'} style={{ fontSize: 15 }} />
          </button>

          <div className="chip-row" role="group" aria-label="Filter holdings">
            {(['All', 'Stocks & ETFs', 'Crypto'] as Filter[]).map(f => (
              <button key={f} className="chip" aria-pressed={f === filter} onClick={() => setFilter(f)}>{f} <span style={{ opacity: 0.6 }}>{data.holdings.filter(h => matches(f, h)).length}</span></button>
            ))}
          </div>

          <div className="card list">
            {shown.map(h => {
              const ch = holdingChange(h);
              return (
                <button key={h.id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', width: '100%', textAlign: 'left' }} onClick={() => open({ type: 'holding', holding: h })}>
                  <span className={'ticker' + (h.kind === 'crypto' ? ' crypto' : '')}>{h.tk}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                    <div className="num muted" style={{ fontSize: 13, marginTop: 2 }}>{h.qty.toLocaleString('en-US')} {h.unit} · {usd(h.price)}</div>
                  </div>
                  <Spark seed={h.tk.length * 3 + (Math.round(holdingValue(h)) % 7)} up={ch >= 0} />
                  <div className="num" style={{ textAlign: 'right', width: 80, flex: 'none' }}>
                    <Money value={holdingValue(h)} style={{ fontSize: 15, display: 'block' }} />
                    <div style={{ fontSize: 13, marginTop: 2, color: ch >= 0 ? 'var(--green)' : 'var(--orange)' }}>{ch >= 0 ? '+' : ''}{(ch * 100).toFixed(1)}%</div>
                  </div>
                </button>
              );
            })}
          </div>

          {leaks.map(h => {
            const sent = data.waste.some(w => w.id === 'fee-' + h.id);
            const yearly = holdingValue(h) * ((h.fee! - 0.03) / 100);
            return (
              <div key={h.id} className="card" style={{ borderRadius: 18, padding: 16, boxShadow: 'inset 0 0 0 1px rgba(224,112,58,.3)' }}>
                <div className="eyebrow orange" style={{ letterSpacing: '.12em' }}>FEE LEAK</div>
                <div style={{ fontSize: 16, marginTop: 8, lineHeight: 1.45 }}>{h.name} charges {h.fee}% a year. A broad index fund at 0.03% would cost about {usd(yearly)} less each year.</div>
                <button className="btn-tint" style={{ marginTop: 14 }} disabled={sent} onClick={() => sendLeak(h)}>{sent ? 'In Waste Finder' : 'Send to Waste Finder'}</button>
              </div>
            );
          })}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="btn-primary big" onClick={() => open({ type: 'holding' })}>Add holding</button>
            <button className="btn-secondary big" onClick={() => open({ type: 'prices' })}>Update prices</button>
          </div>
          <div className="muted" style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.45, padding: '0 10px' }}>
            Prices {pricedAt ? `as of ${fmtDay(fromISO(pricedAt))}, ` : ''}entered by hand. Tap a holding to edit it. No brokerage or exchange connection in this version.
          </div>
        </>
      )}
    </div>
  );
}
