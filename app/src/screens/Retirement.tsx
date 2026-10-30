import { useState } from 'react';
import { Gauge } from '../components/Gauge';
import { Header, Money } from '../components/ui';
import { fmtMonthYear, runway, today } from '../lib/dates';
import { fvSeries, monthsToGoal } from '../lib/finance';
import { pct, usd, usdCompact } from '../lib/format';
import type { Route } from '../router';
import { useSheet } from '../sheets/SheetHost';
import { reclaimed, retirement, wasteSummary } from '../store/derive';
import { useStore } from '../store/Store';
import { DESTINATIONS } from '../store/types';

const DEST_COLOR = { Savings: 'var(--green)', Investments: 'var(--amber)', 'Retirement goal': 'var(--text)' } as const;

export function Retirement({ go }: { go: (r: Route) => void }) {
  const { data } = useStore();
  const open = useSheet();
  const r = retirement(data);
  const ws = wasteSummary(data);
  const rec = reclaimed(data);
  const max = Math.max(100, Math.round(ws.total));
  const [slide, setSlide] = useState(() => Math.round(max / 2));
  const s = Math.min(slide, max);
  const run = runway(r.target);
  const withReclaim = monthsToGoal(r.nw, r.c.monthlyContribution + s, r.c.goal.number, r.c.returnRate);
  const sooner = Number.isFinite(r.baseMonths) && Number.isFinite(withReclaim) ? r.baseMonths - withReclaim : 0;
  const newDate = Number.isFinite(withReclaim) ? new Date(today().getFullYear(), today().getMonth() + withReclaim, 1) : null;
  const added = fvSeries(s, run.months, r.c.returnRate);
  const onPace = r.projDate && r.projDate <= r.target;

  return (
    <div className="screen">
      <Header back={{ label: 'Home', onClick: () => go('home') }} title="Semi-retirement" right={<button className="link-sm" onClick={() => open({ type: 'goal' })}>Edit goal</button>} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Gauge pct={r.funded} size={280} thickness={14} text={run.text} numSize={34} label={`${pct(r.funded)} funded`} sub={`Target: ${r.target.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`} />
      </div>
      <div className="card" style={{ borderRadius: 16, padding: 14, fontSize: 15, lineHeight: 1.45 }}>
        {r.projDate ? (
          <>At {usd(r.c.monthlyContribution)}/mo invested and {Math.round(r.c.returnRate * 100)}% growth, you reach {usdCompact(r.c.goal.number)} in <b>{fmtMonthYear(r.projDate)}</b>, <span style={{ color: onPace ? 'var(--green)' : 'var(--orange)' }}>{onPace ? 'on pace' : 'behind your target'}</span>.</>
        ) : <>Add your accounts in Net Worth and set how much you invest each month to see a projection.</>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="card" style={{ borderRadius: 16, padding: 14 }}>
          <div className="muted" style={{ fontSize: 13 }}>Target income</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 300, marginTop: 4 }}>{usd(r.c.goal.monthlyIncome)}<span className="muted" style={{ fontSize: 14 }}>/mo</span></div>
        </div>
        <div className="card" style={{ borderRadius: 16, padding: 14 }}>
          <div className="muted" style={{ fontSize: 13 }}>Supported today</div>
          <div className="num" style={{ fontSize: 22, fontWeight: 300, marginTop: 4 }}><Money value={r.supported} /><span className="muted" style={{ fontSize: 14 }}>/mo</span></div>
        </div>
        <div className="card" style={{ gridColumn: 'span 2', borderRadius: 16, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'inset 0 0 0 1px rgba(224,112,58,.25)' }}>
          <div>
            <div className="muted" style={{ fontSize: 13 }}>Gap to close</div>
            <div className="num orange" style={{ fontSize: 22, fontWeight: 300, marginTop: 4 }}>{usd(r.gap)}/mo</div>
          </div>
          <div style={{ width: 120 }}>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
              <div style={{ flex: Math.min(100, Math.round(r.funded * 100)), background: 'var(--amber)' }} />
              <div style={{ flex: Math.max(0, 100 - Math.round(r.funded * 100)), background: 'var(--line)' }} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6, textAlign: 'right' }}>{Math.round(r.funded * 100)} / 100%</div>
          </div>
        </div>
      </div>

      <div className="card feature" style={{ padding: '20px 18px' }}>
        <div className="eyebrow amber">WHAT IF YOU RECLAIM</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
          <span className="num" style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-.02em' }}>{usd(s)}</span>
          <span className="muted" style={{ fontSize: 16 }}>/mo in waste</span>
        </div>
        <input id="ret-slider" type="range" min={0} max={max} step={1} value={s} onChange={e => setSlide(Number(e.target.value))} aria-label="Monthly waste to reclaim" aria-valuetext={`${usd(s)} per month`} style={{ width: '100%', margin: '18px 0 6px' }} />
        <div className="num muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>$0</span><span>{ws.total > 0 ? `All flagged · ${usd(ws.total)}` : usd(max)}</span></div>
        <div aria-live="polite" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)', fontSize: 19, lineHeight: 1.35 }}>
          You reach your number <span className="green">{sooner <= 0 ? 'on the same schedule' : `${sooner} month${sooner > 1 ? 's' : ''} sooner`}</span>.
        </div>
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 14 }}><span className="muted">New projected date</span><span>{newDate ? fmtMonthYear(newDate) : '—'}</span></div>
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 14 }}><span className="muted">Added by {r.c.goal.year}, invested at {Math.round(r.c.returnRate * 100)}%</span><span className="amber">{usd(added)}</span></div>
        <button className="btn-tint" style={{ marginTop: 16, width: '100%' }} onClick={() => go('waste')}>Find it in Waste Finder</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 18 }}>Where reclaimed money went</span>
          <Money value={rec.total} className="green" style={{ fontSize: 15 }} />
        </div>
        {rec.total > 0 ? (
          <>
            <div className="split" style={{ height: 8, marginTop: 14 }}>
              {DESTINATIONS.filter(d => rec.byDest[d] > 0).map(d => <div key={d} style={{ flex: rec.byDest[d], background: DEST_COLOR[d], opacity: d === 'Retirement goal' ? 0.7 : 1 }} />)}
            </div>
            <div className="num" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, fontSize: 14 }}>
              {DESTINATIONS.map(d => <div key={d} style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{d}</span><Money value={rec.byDest[d]} /></div>)}
            </div>
            {rec.monthlyRedirect > 0 && <div className="muted" style={{ fontSize: 13, marginTop: 12 }}>{usd(rec.monthlyRedirect)}/mo is being redirected right now.</div>}
          </>
        ) : <div className="muted" style={{ fontSize: 14, marginTop: 10 }}>Reclaim an item in Waste Finder and it shows up here.</div>}
      </div>
    </div>
  );
}
