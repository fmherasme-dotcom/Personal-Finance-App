import { useState } from 'react';
import { Sheet } from '../components/ui';
import { fiveYear } from '../lib/finance';
import { pct, usd } from '../lib/format';
import { cfg, retirement } from '../store/derive';
import { useStore } from '../store/Store';
import type { Destination, WasteItem } from '../store/types';

export function ReclaimSheet({ onClose, item }: { onClose: () => void; item: WasteItem }) {
  const { data, reclaim, notify } = useStore();
  const c = cfg(data);
  const [dest, setDest] = useState<Destination>('Investments');
  const [saving, setSaving] = useState(false);
  const options: { d: Destination; label: string; sub: string }[] = [
    { d: 'Savings', label: 'Move to Savings', sub: c.savingsAccount },
    { d: 'Investments', label: 'Move to Investments', sub: c.investAccount },
    { d: 'Retirement goal', label: 'Apply to Retirement Goal', sub: `Semi-retirement fund · ${pct(retirement(data).funded)} funded` },
  ];
  const isBill = !!item.billId;

  const submit = async () => {
    setSaving(true);
    try {
      await reclaim(item, dest);
      notify(`Reclaimed ${usd(item.monthly)}/mo to ${dest}`);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Sheet open onClose={onClose} eyebrow="RECLAIM" title={item.name}>
      <div className="muted num" style={{ fontSize: 15, marginTop: -8 }}>{usd(item.monthly)}/mo · {usd(item.monthly * 12)}/yr · {item.why}</div>
      <div className="muted" style={{ fontSize: 14, marginTop: 8 }}>{isBill || item.group === 'Subscriptions' ? 'Cancel it, then send' : 'Cut it, then send'} {usd(item.monthly)} each month to</div>
      <div role="radiogroup" aria-label="Destination" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(o => (
          <button key={o.d} type="button" role="radio" aria-checked={dest === o.d} className="radio-card" onClick={() => setDest(o.d)}>
            <span className="radio-dot" />
            <span style={{ flex: 1, textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 16 }}>{o.label}</span>
              <span className="muted" style={{ display: 'block', fontSize: 13, marginTop: 2 }}>{o.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <span className="muted" style={{ fontSize: 15 }}>Worth in 5 years at {Math.round(c.returnRate * 100)}%</span>
        <span className="num amber" style={{ fontSize: 28, fontWeight: 300 }}>{usd(fiveYear(item.monthly, c.returnRate))}</span>
      </div>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
        Reclaim logs the redirect{isBill ? ' and removes the bill from your list' : ''}. It doesn't move money on its own, so set up the transfer with your bank.
      </div>
      <button className="btn-primary big" onClick={submit} disabled={saving}>{saving ? 'Saving…' : `Reclaim ${usd(item.monthly)}/mo`}</button>
    </Sheet>
  );
}
