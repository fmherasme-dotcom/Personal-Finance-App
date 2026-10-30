import { Gauge } from '../components/Gauge';
import { BriefcaseIcon, ChevronIcon, ClockIcon, CoachIcon, ListIcon, ThemeIcon } from '../components/Icons';
import { Avatar, Money, Segmented, Tag } from '../components/ui';
import { fmtDay, fromISO, monthShort, runway } from '../lib/dates';
import { fiveYear } from '../lib/finance';
import { usd, usdCompact } from '../lib/format';
import type { Route } from '../router';
import { useSheet } from '../sheets/SheetHost';
import { billStatus, billsSummary, cfg, netWorth, reclaimed, retirement, STATUS_STYLE, wasteSummary, weekFlow, weekRange } from '../store/derive';
import { usePrefs } from '../store/prefs';
import { useStore } from '../store/Store';
import { useTheme } from '../theme';

export function Home({ go }: { go: (r: Route) => void }) {
  const { data } = useStore();
  const { prefs, setPref } = usePrefs();
  const { toggle } = useTheme();
  const open = useSheet();
  const c = cfg(data);
  const me = data.members.find(m => m.id === prefs.meId) ?? data.members.find(m => m.role === 'Owner') ?? data.members[0];
  const personal = prefs.scope === 'personal' && !!me;
  const wk = weekRange();
  const flow = weekFlow(data, personal ? me!.id : null);
  const nw = netWorth(data);
  const ws = wasteSummary(data);
  const rec = reclaimed(data);
  const ret = retirement(data);
  const bills = billsSummary(data);
  const run = runway(ret.target);
  const top = [...ws.open].filter(w => !personal || w.source === 'Personal').sort((a, b) => b.monthly - a.monthly).slice(0, 3);
  const kept = flow.in - flow.out;
  const bigMove = [...ws.open].sort((a, b) => b.monthly - a.monthly)[0];
  const weekWaste = personal ? (ws.personal * 12) / 52 : ws.weekly;
  const reviewed = data.reviews.some(r => r.id === wk.startISO);
  const memberName = (id: string) => data.members.find(m => m.id === id)?.name.split(' ')[0] ?? '';

  return (
    <div className="screen with-tabs">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="muted" style={{ fontSize: 14 }}>Week of {fmtDay(wk.start)} – {fmtDay(wk.end)}</div>
          <h1 className="title" style={{ marginTop: 2 }}>Weekly Pulse</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="round-btn" aria-label="Switch light or dark mode" onClick={toggle}><ThemeIcon /></button>
          <button className="round-btn" aria-label="Settings" onClick={() => go('prefs')} style={{ padding: 0 }}><Avatar name={me?.name ?? '?'} size={42} active /></button>
        </div>
      </div>

      {c.example && (
        <button className="example-banner" onClick={() => go('prefs')}>
          <span><b>Example data.</b> Explore freely, then start fresh with your own numbers in Settings.</span><ChevronIcon />
        </button>
      )}

      <Segmented label="View" options={[{ value: 'household', label: 'Household' }, { value: 'personal', label: 'Personal' }]} value={prefs.scope} onChange={v => setPref('scope', v)} />

      <div className="home-grid">
        <button className="reclaimed-strip" onClick={() => go('waste')}>
          <span className="eyebrow">RECLAIMED THIS YEAR</span>
          <Money value={rec.total} className="green" style={{ fontSize: 20 }} />
        </button>

        <button className="card gauge-card" onClick={() => go('networth')}>
          <Gauge pct={ret.funded} size={270} thickness={7} num={nw.value} prefix="$" numSize={38} label="Net worth" sub={nw.weekChange ? `${nw.weekChange >= 0 ? '+' : '−'}${usd(Math.abs(nw.weekChange)).replace('−', '')} this week` : 'No change logged this week'} subColor={nw.weekChange >= 0 ? 'var(--green)' : 'var(--orange)'} hidden={prefs.hideBalances} />
          <div className="muted num" style={{ display: 'flex', gap: 28, marginTop: -6, fontSize: 13 }}>
            <span>Assets <Money value={nw.totalAssets} format={usdCompact} style={{ color: 'var(--text)' }} /></span>
            <span>Liabilities <Money value={nw.totalLiabs} format={usdCompact} style={{ color: 'var(--text)' }} /></span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Arc shows progress to your {usdCompact(c.goal.number)} semi-retirement number</div>
        </button>

        <div className="flow-grid">
          <div className="card stat"><div className="eyebrow">IN</div><Money value={flow.in} className="stat-num" /><div className="stat-sub">{personal ? 'your income' : `${usdCompact(flow.draws)} draws`}</div></div>
          <div className="card stat"><div className="eyebrow">OUT</div><Money value={flow.out} className="stat-num" /><div className="stat-sub">{flow.avgOut ? `${flow.vsAvg <= 0 ? '−' : '+'}${Math.abs(Math.round(flow.vsAvg * 100))}% vs avg` : personal ? 'your spending' : 'this week'}</div></div>
          <button className="card stat warn" onClick={() => go('waste')}><div className="eyebrow orange">WASTED</div><Money value={weekWaste} className="stat-num orange" /><div className="stat-sub">this week</div></button>
        </div>

        <div className="card" style={{ paddingBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 18 }}>Waste spotted this week</span>
            <span className="muted" style={{ fontSize: 14 }}>{top.length} of {ws.open.length}</span>
          </div>
          <div className="muted" style={{ fontSize: 14, margin: '6px 0 8px' }}>
            Potential <span className="amber num">{usd(ws.total)}/mo</span> · {usd(ws.year)}/yr
          </div>
          {top.length === 0 && <div className="muted row" style={{ padding: '14px 0', fontSize: 15 }}>Nothing open right now. Nice work.</div>}
          {top.map(w => (
            <div key={w.id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{w.name}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{w.source} · {w.group === 'Over-budget Categories' ? 'Over budget' : w.why}</div>
              </div>
              <div className="num" style={{ textAlign: 'right' }}>
                <div className="orange" style={{ fontSize: 16 }}>{usd(w.monthly)}/mo</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{usd(w.monthly * 12)}/yr</div>
              </div>
              <button className="btn-tint sm" onClick={() => open({ type: 'reclaim', item: w })}>Reclaim</button>
            </div>
          ))}
          <button className="row link-row" onClick={() => go('waste')}>Open Waste Finder</button>
        </div>

        <button className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, textAlign: 'left' }} onClick={() => go('retirement')}>
          <Gauge pct={ret.funded} size={92} thickness={11} ticks={false} text={`${Math.round(ret.funded * 100)}%`} numSize={20} gap={0} padTop={4} />
          <div style={{ flex: 1 }}>
            <div className="eyebrow">RETIREMENT RUNWAY</div>
            <div style={{ fontSize: 17, marginTop: 6, lineHeight: 1.3 }}>{run.text} to semi-retirement · {Math.round(ret.funded * 100)}% funded</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{monthShort(c.goal.month)} {c.goal.year} · {usd(c.goal.monthlyIncome)}/mo target</div>
          </div>
          <span className="muted"><ChevronIcon /></span>
        </button>

        <div className="card" style={{ paddingBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>Bills · next 7 days</span>
            <Money value={bills.next7Total} className="muted" style={{ fontSize: 14 }} />
          </div>
          {bills.next7.length === 0 && <div className="muted row" style={{ padding: '12px 0 14px', fontSize: 15 }}>Nothing due this week.</div>}
          {bills.next7.slice(0, 5).map(b => {
            const st = billStatus(b);
            const d = fromISO(b.due);
            const [bg, col] = STATUS_STYLE[st];
            return (
              <button key={b.id} className="row bill-mini" onClick={() => go('bills')}>
                <div style={{ width: 40, textAlign: 'center', color: st === 'Overdue' ? 'var(--red)' : undefined }}>
                  <div style={{ fontSize: 11, letterSpacing: '.1em' }} className={st === 'Overdue' ? '' : 'muted'}>{monthShort(d.getMonth()).toUpperCase()}</div>
                  <div style={{ fontSize: 19 }}>{d.getDate()}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 15 }}>{b.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{memberName(b.payerId)}{st === 'Possibly unused' && b.lastUsed ? ` · last used ${Math.round((Date.now() - fromISO(b.lastUsed).getTime()) / 86400000)} days ago` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Money value={b.amount} format={n => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })} style={{ fontSize: 15, display: 'block' }} />
                  <Tag bg={bg} color={col}>{st}</Tag>
                </div>
              </button>
            );
          })}
        </div>

        <div className="card feature" style={{ padding: '20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="amber"><CoachIcon /><span className="eyebrow amber">THIS WEEK'S COACH RECAP</span>{reviewed && <Tag bg="rgba(63,163,122,.15)" color="var(--green)">Reviewed</Tag>}</div>
          <div style={{ fontSize: 20, marginTop: 12, lineHeight: 1.3 }}>
            {kept >= 0 ? `${usd(kept)} stayed with the household.` : `You spent ${usd(-kept)} more than came in.`}
            {bigMove ? ` One move could add ${usdCompact(fiveYear(bigMove.monthly, c.returnRate))} in five years.` : ' No open leaks this week.'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span className="muted" style={{ fontSize: 14 }}>3 min read</span>
            <button className="btn-primary" style={{ height: 40, padding: '0 18px', borderRadius: 12 }} onClick={() => go('coach')}>Open recap</button>
          </div>
        </div>

        <div className="quick-grid">
          <button className="card quick" onClick={() => go('business')}><BriefcaseIcon />Business</button>
          <button className="card quick" onClick={() => go('retirement')}><ClockIcon />Retirement</button>
          <button className="card quick" onClick={() => go('budget')}><ListIcon />Budget</button>
        </div>
      </div>
    </div>
  );
}
