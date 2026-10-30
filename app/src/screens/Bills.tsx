import { useState } from 'react';
import { BigBillsIcon, FlagIcon } from '../components/Icons';
import { Empty, Money, Tag } from '../components/ui';
import { addDays, daysBetween, DOW, fmtDay, fromISO, toISO, today, weekStart } from '../lib/dates';
import { usdCents } from '../lib/format';
import type { Route } from '../router';
import { useSheet } from '../sheets/SheetHost';
import { billStatus, billsSummary, STATUS_STYLE } from '../store/derive';
import { useStore } from '../store/Store';
import type { Bill } from '../store/types';

type Filter = 'All' | 'Bills' | 'Subscriptions';
const ORDER = { Overdue: 0, 'Due soon': 1, 'Possibly unused': 2, Upcoming: 3, Paid: 4 } as const;

export function Bills({ go }: { go: (r: Route) => void }) {
  const { data, flagBill, unflagBill, markBillPaid, notify } = useStore();
  const open = useSheet();
  const [filter, setFilter] = useState<Filter>('All');
  const [day, setDay] = useState<string | null>(null);
  const sum = billsSummary(data);
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart(t), i));
  const name = (id: string) => data.members.find(m => m.id === id)?.name.split(' ')[0] ?? '';

  if (data.bills.length === 0) {
    return (
      <div className="screen with-tabs">
        <h1 className="title">Bills &amp; subscriptions</h1>
        <Empty icon={<BigBillsIcon />} title="No bills tracked yet" body="Add your mortgage, utilities, cards and subscriptions once. Reclaim shows what's due each week and flags the ones nobody uses.">
          <button className="btn-primary big" onClick={() => open({ type: 'bill' })}>Add a bill or subscription</button>
          <button className="btn-secondary big" onClick={() => go('import')}>Import from statement · Coming soon</button>
        </Empty>
      </div>
    );
  }

  const list = data.bills
    .filter(b => filter === 'All' || (filter === 'Bills' ? b.kind === 'bill' : b.kind === 'subscription'))
    .filter(b => !day || b.due === day)
    .sort((a, b) => ORDER[billStatus(a)] - ORDER[billStatus(b)] || a.due.localeCompare(b.due));

  const flagged = (b: Bill) => data.waste.some(w => w.id === 'bill-' + b.id);

  return (
    <div className="screen with-tabs">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title">Bills &amp; subscriptions</h1>
        <button className="link-sm" onClick={() => open({ type: 'bill' })}>+ Add</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="card" style={{ borderRadius: 16, padding: 14 }}><div className="muted" style={{ fontSize: 13 }}>Monthly recurring</div><Money value={sum.monthly} style={{ fontSize: 24, fontWeight: 300, marginTop: 4, display: 'block' }} /></div>
        <div className="card" style={{ borderRadius: 16, padding: 14 }}><div className="muted" style={{ fontSize: 13 }}>Annual recurring</div><Money value={sum.annual} className="amber" style={{ fontSize: 24, fontWeight: 300, marginTop: 4, display: 'block' }} /></div>
      </div>

      <div className="card" style={{ borderRadius: 18, padding: '14px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px 10px', fontSize: 14 }}>
          <span>{fmtDay(days[0])} – {fmtDay(days[6])}</span>
          {day ? <button className="link-sm" onClick={() => setDay(null)}>Show all</button> : <span className="muted">This week</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, textAlign: 'center' }}>
          {days.map(d => {
            const iso = toISO(d);
            const due = data.bills.filter(b => b.due === iso);
            const isToday = daysBetween(d, t) === 0;
            const sel = day === iso;
            return (
              <button key={iso} className="cal-day" aria-pressed={sel} aria-label={`${fmtDay(d)}, ${due.length} due`} onClick={() => setDay(sel ? null : iso)}
                style={{ background: sel || isToday ? 'rgba(212,162,76,.12)' : 'transparent', boxShadow: sel || isToday ? 'inset 0 0 0 1px var(--amber)' : 'none' }}>
                <div className="muted" style={{ fontSize: 11, letterSpacing: '.06em' }}>{DOW[d.getDay()]}</div>
                <div className="num" style={{ fontSize: 18, marginTop: 4, color: isToday ? 'var(--amber)' : 'var(--text)' }}>{d.getDate()}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 3, height: 5, marginTop: 6 }}>
                  {due.slice(0, 3).map(b => <span key={b.id} style={{ width: 5, height: 5, borderRadius: 3, background: STATUS_STYLE[billStatus(b)][1] }} />)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="chip-row" role="group" aria-label="Filter bills">
        {(['All', 'Bills', 'Subscriptions'] as Filter[]).map(f => (
          <button key={f} className="chip" aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {f} <span style={{ opacity: 0.6 }}>{data.bills.filter(b => f === 'All' || (f === 'Bills' ? b.kind === 'bill' : b.kind === 'subscription')).length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 && <div className="card muted" style={{ fontSize: 15 }}>Nothing due {day ? `on ${fmtDay(fromISO(day))}` : 'here'}.</div>}
      {list.map(b => {
        const st = billStatus(b);
        const [bg, col] = STATUS_STYLE[st];
        const f = flagged(b);
        const used = b.kind === 'subscription' && b.lastUsed ? daysBetween(fromISO(b.lastUsed), t) : null;
        return (
          <div key={b.id} className="card" style={{ borderRadius: 18, padding: '14px 16px', boxShadow: st === 'Overdue' ? 'inset 0 0 0 1px rgba(217,83,79,.35)' : undefined }}>
            <button style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left' }} onClick={() => open({ type: 'bill', bill: b })}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16 }}>{b.name}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                  {st === 'Paid' && b.lastPaid ? `Paid ${fmtDay(fromISO(b.lastPaid))} · next ${fmtDay(fromISO(b.due))}` : `Due ${fmtDay(fromISO(b.due))}`} · {name(b.payerId)}
                </div>
              </div>
              <div className="num" style={{ textAlign: 'right' }}>
                <Money value={b.amount} format={usdCents} style={{ fontSize: 16, display: 'block' }} />
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{b.freq}</div>
              </div>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Tag bg={bg} color={col}>{st}</Tag>
              <span style={{ fontSize: 12, flex: 1, color: st === 'Possibly unused' ? 'var(--orange)' : 'var(--muted)' }}>
                {used != null ? (used === 0 ? 'Used today' : `Last used ${used} day${used === 1 ? '' : 's'} ago`) : ''}
              </span>
              {st !== 'Paid' && (
                <button className="btn-small" onClick={async () => { await markBillPaid(b); notify(`${b.name} marked paid${b.category ? ' and added to ' + b.category : ''}`); }}>Mark paid</button>
              )}
              <button className={'flag-btn' + (f ? ' on' : '')} onClick={async () => {
                if (f) { await unflagBill(b); notify(`${b.name} removed from Waste Finder`); }
                else { await flagBill(b); notify(`${b.name} sent to Waste Finder`); }
              }}><FlagIcon />{f ? 'In Waste Finder' : 'Flag as waste'}</button>
            </div>
          </div>
        );
      })}
      <div className="muted" style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.45 }}>Tap a bill to edit it. For subscriptions, update "Last used" when someone uses it.</div>
    </div>
  );
}
