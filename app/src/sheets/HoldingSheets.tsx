import { useState } from 'react';
import { ConfirmButton, Field, Sheet } from '../components/ui';
import { todayISO } from '../lib/dates';
import { parseMoney, uid, usd } from '../lib/format';
import { useStore } from '../store/Store';
import type { Holding, HoldingKind } from '../store/types';

const KINDS: { value: HoldingKind; label: string }[] = [
  { value: 'etf', label: 'Index ETF' },
  { value: 'stock', label: 'Stock' },
  { value: 'fund', label: 'Active fund' },
  { value: 'crypto', label: 'Crypto' },
];

export function HoldingSheet({ onClose, holding }: { onClose: () => void; holding?: Holding }) {
  const { saveHoldings, removeHolding, notify } = useStore();
  const [tk, setTk] = useState(holding?.tk ?? '');
  const [name, setName] = useState(holding?.name ?? '');
  const [kind, setKind] = useState<HoldingKind>(holding?.kind ?? 'stock');
  const [qty, setQty] = useState(holding ? String(holding.qty) : '');
  const [price, setPrice] = useState(holding ? String(holding.price) : '');
  const [fee, setFee] = useState(holding?.fee != null ? String(holding.fee) : '');
  const [saving, setSaving] = useState(false);
  const q = parseMoney(qty), p = parseMoney(price);
  const valid = tk.trim() && name.trim() && q > 0 && p > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const T = tk.trim().toUpperCase();
      await saveHoldings([{
        id: holding?.id ?? uid(), tk: T, name: name.trim(), kind, qty: q, unit: kind === 'crypto' ? T : 'sh',
        price: p, prevPrice: holding && holding.price === p ? holding.prevPrice : holding?.price ?? p,
        fee: fee ? parseMoney(fee) : undefined, pricedAt: todayISO(),
      }]);
      notify(holding ? `${T} updated` : `${T} added to your portfolio`);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={holding ? `Edit ${holding.tk}` : 'Add holding'}>
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-grid">
          <Field label="Ticker"><input id="h-tk" className="input" value={tk} onChange={e => setTk(e.target.value)} placeholder="VTI" autoFocus={!holding} /></Field>
          <Field label="Type">
            <select id="h-kind" className="input" value={kind} onChange={e => setKind(e.target.value as HoldingKind)}>{KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
          </Field>
        </div>
        <Field label="Name"><input id="h-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Total US Market ETF" /></Field>
        <div className="form-grid">
          <Field label={kind === 'crypto' ? 'Coins' : 'Shares'}><input id="h-qty" className="input num" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} /></Field>
          <Field label="Price each"><input id="h-price" className="input num" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} /></Field>
        </div>
        {(kind === 'fund' || kind === 'etf') && (
          <Field label="Annual fee (expense ratio %)" hint="Funds over 0.5% get flagged as a fee leak.">
            <input id="h-fee" className="input num" inputMode="decimal" value={fee} onChange={e => setFee(e.target.value)} placeholder="0.03" />
          </Field>
        )}
        {q > 0 && p > 0 && <div className="num muted" style={{ fontSize: 15 }}>Value: <span style={{ color: 'var(--text)' }}>{usd(q * p)}</span></div>}
        <button className="btn-primary big" disabled={!valid || saving}>{saving ? 'Saving…' : holding ? 'Save holding' : 'Add holding'}</button>
        {holding && <ConfirmButton onConfirm={async () => { await removeHolding(holding.id); notify(`${holding.tk} removed`); onClose(); }}>Remove holding</ConfirmButton>}
      </form>
    </Sheet>
  );
}

export function PricesSheet({ onClose }: { onClose: () => void }) {
  const { data, saveHoldings, notify } = useStore();
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(data.holdings.map(h => [h.id, String(h.price)])));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const changed = data.holdings
      .map(h => ({ h, p: parseMoney(prices[h.id] ?? '') }))
      .filter(({ h, p }) => p > 0 && p !== h.price)
      .map(({ h, p }) => ({ ...h, prevPrice: h.price, price: p, pricedAt: todayISO() }));
    if (!changed.length) return onClose();
    setSaving(true);
    try {
      await saveHoldings(changed);
      notify(`${changed.length} price${changed.length > 1 ? 's' : ''} updated`);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="Update prices">
      <div className="muted" style={{ fontSize: 14, marginTop: -6 }}>Enter today's price for each holding. The weekly change compares against the last price you entered.</div>
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.holdings.map(h => (
          <label key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="ticker" style={{ width: 54 }}>{h.tk}</span>
            <span style={{ flex: 1, fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
            <input id={'price-' + h.id} className="input num" style={{ width: 120, textAlign: 'right' }} inputMode="decimal" value={prices[h.id] ?? ''} onChange={e => setPrices(p => ({ ...p, [h.id]: e.target.value }))} aria-label={`${h.tk} price`} />
          </label>
        ))}
        <button className="btn-primary big" style={{ marginTop: 8 }} disabled={saving}>{saving ? 'Saving…' : 'Save prices'}</button>
      </form>
    </Sheet>
  );
}
