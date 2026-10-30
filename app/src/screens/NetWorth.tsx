import { useState } from 'react';
import { LineChart, MonthAxis } from '../components/Charts';
import { Gauge } from '../components/Gauge';
import { ConfirmButton, Field, Money, Segmented, Sheet } from '../components/ui';
import { fmtDay, fromISO } from '../lib/dates';
import { parseMoney, pct, signedUsd, uid, usdCompact } from '../lib/format';
import type { Route } from '../router';
import { useSheet } from '../sheets/SheetHost';
import { accountValue, cfg, netWorth, portfolio } from '../store/derive';
import { usePrefs } from '../store/prefs';
import { useStore } from '../store/Store';
import type { Account } from '../store/types';

function AccountSheet({ onClose, account, kind }: { onClose: () => void; account?: Account; kind: Account['kind'] }) {
  const { data, save, remove, updateAccount, notify } = useStore();
  const [k, setK] = useState<Account['kind']>(account?.kind ?? kind);
  const [name, setName] = useState(account?.name ?? '');
  const [note, setNote] = useState(account?.note ?? '');
  const [value, setValue] = useState(account ? String(account.value) : '');
  const v = parseMoney(value);
  const valid = name.trim() && v >= 0;
  const submit = async () => {
    if (!valid) return;
    const id = account?.id ?? uid();
    await save('accounts', { ...(account ?? {}), id, name: name.trim(), note: note.trim(), kind: k, value: account?.value ?? v, order: account?.order ?? data.accounts.length });
    await updateAccount(id, v);
    notify(account ? `${name.trim()} saved` : `${name.trim()} added to net worth`);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={account ? 'Edit account' : 'Add account'}>
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Segmented label="Type" options={[{ value: 'asset', label: 'Asset' }, { value: 'liability', label: 'Liability' }]} value={k} onChange={setK} />
        <Field label="Name"><input id="acct-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder={k === 'asset' ? 'e.g. Cash, Real estate' : 'e.g. Mortgage'} autoFocus={!account} /></Field>
        <Field label="Details"><input id="acct-note" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. 3 accounts, 5.1% · 22 yrs left" /></Field>
        <Field label={k === 'asset' ? 'Current value' : 'Balance owed'}><input id="acct-value" className="input num big-input" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} /></Field>
        <button className="btn-primary big" disabled={!valid}>{account ? 'Save account' : 'Add account'}</button>
        {account && <ConfirmButton onConfirm={async () => { await remove('accounts', account.id); notify(`${account.name} removed`); onClose(); }}>Remove account</ConfirmButton>}
      </form>
    </Sheet>
  );
}

export function NetWorth({ go }: { go: (r: Route) => void }) {
  const { data } = useStore();
  const { prefs } = usePrefs();
  const open = useSheet();
  const [editing, setEditing] = useState<{ account?: Account; kind: Account['kind'] } | null>(null);
  const c = cfg(data);
  const nw = netWorth(data);
  const pf = portfolio(data);
  const funded = nw.value / c.goal.number;
  const maxRow = Math.max(1, ...data.accounts.map(a => accountValue(a, data)));

  const list = (accts: Account[], color: string) => (
    <div className="card list">
      {accts.length === 0 && <div className="muted" style={{ padding: '14px 0', fontSize: 14 }}>None yet.</div>}
      {accts.map(a => {
        const val = accountValue(a, data);
        return (
          <div key={a.id} className="row" style={{ padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button style={{ flex: 1, minWidth: 0, textAlign: 'left' }} onClick={() => (a.linked ? go('portfolio') : setEditing({ account: a, kind: a.kind }))}>
                <div style={{ fontSize: 15 }}>{a.name}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{a.linked ? `Stocks & crypto · ${data.holdings.length} holdings` : a.note}{a.updatedAt && !a.linked ? ` · ${fmtDay(fromISO(a.updatedAt))}` : ''}</div>
              </button>
              <Money value={val} style={{ fontSize: 16 }} />
              <button className="btn-small" onClick={() => (a.linked ? go('portfolio') : open({ type: 'balance', accountId: a.id }))}>{a.linked ? 'Open' : 'Update'}</button>
            </div>
            <div className="bar-track" style={{ height: 3, marginTop: 10 }}>
              <div className="bar-fill" style={{ background: color, width: `${Math.min(100, Math.max(2, (val / maxRow) * 100))}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="screen with-tabs">
      <div aria-hidden="true" className="glow" />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title">Net Worth</h1>
        <span className="muted" style={{ fontSize: 13 }}>{c.household}</span>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 4px' }}>
        <Gauge pct={funded} size={310} thickness={7} num={nw.value} prefix="$" numSize={44} label="Total net worth" hidden={prefs.hideBalances}
          sub={nw.weekChange ? `${signedUsd(nw.weekChange)} this week` : 'No change this week'} subColor={nw.weekChange >= 0 ? 'var(--green)' : 'var(--orange)'} subSize={15} />
        <div className="muted" style={{ fontSize: 13, marginTop: -8 }}>{pct(funded)} of your {usdCompact(c.goal.number)} semi-retirement number</div>
      </div>

      <div className="card">
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div><div className="muted" style={{ fontSize: 13 }}>Assets</div><Money value={nw.totalAssets} className="green" style={{ fontSize: 22, fontWeight: 300, marginTop: 3, display: 'block' }} /></div>
          <div style={{ textAlign: 'right' }}><div className="muted" style={{ fontSize: 13 }}>Liabilities</div><Money value={nw.totalLiabs} className="orange" style={{ fontSize: 22, fontWeight: 300, marginTop: 3, display: 'block' }} /></div>
        </div>
        <div className="split" style={{ height: 8, marginTop: 14 }}>
          <div style={{ flex: Math.max(1, nw.totalAssets), background: 'var(--green)' }} />
          <div style={{ flex: Math.max(1, nw.totalLiabs), background: 'var(--orange)' }} />
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 18 }}>12-month trend</span>
          <span className="num" style={{ fontSize: 14, color: nw.yearChange >= 0 ? 'var(--green)' : 'var(--orange)' }}>{prefs.hideBalances ? '' : signedUsd(nw.yearChange)}</span>
        </div>
        <div style={{ marginTop: 16 }}><LineChart series={[{ values: nw.trend, color: 'var(--amber)', fill: true }]} /></div>
        <MonthAxis keys={nw.trendKeys} every={3} />
      </div>

      <button onClick={() => go('portfolio')} className="card feature" style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 18, padding: 16, textAlign: 'left' }}>
        <div style={{ flex: 1 }}>
          <div className="eyebrow amber" style={{ letterSpacing: '.12em' }}>STOCKS &amp; CRYPTO</div>
          <Money value={pf.total} style={{ fontSize: 22, fontWeight: 300, marginTop: 6, display: 'block' }} />
          <div style={{ fontSize: 13, marginTop: 2, color: pf.change >= 0 ? 'var(--green)' : 'var(--orange)' }}>{signedUsd(pf.change)} since last prices · {data.holdings.length} holdings</div>
        </div>
        <span className="amber" style={{ fontSize: 15 }}>Open ›</span>
      </button>

      <div className="section-head"><span className="eyebrow">ASSETS</span><button className="link-sm" onClick={() => setEditing({ kind: 'asset' })}>+ Add asset</button></div>
      {list(nw.assets, 'var(--green)')}
      <div className="section-head"><span className="eyebrow">LIABILITIES</span><button className="link-sm" onClick={() => setEditing({ kind: 'liability' })}>+ Add liability</button></div>
      {list(nw.liabilities, 'var(--orange)')}
      <div className="muted" style={{ fontSize: 13, textAlign: 'center' }}>Tap a name to edit it, or Update to log a new balance. Every update is kept on the trend line.</div>

      {editing && <AccountSheet onClose={() => setEditing(null)} account={editing.account} kind={editing.kind} />}
    </div>
  );
}
