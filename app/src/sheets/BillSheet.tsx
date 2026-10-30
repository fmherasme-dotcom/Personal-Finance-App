import { useState } from 'react';
import { ConfirmButton, Field, Segmented, Sheet } from '../components/ui';
import { addDays, toISO, today } from '../lib/dates';
import { parseMoney, uid } from '../lib/format';
import { useStore } from '../store/Store';
import type { Bill, BillFreq } from '../store/types';

const FREQS: BillFreq[] = ['Weekly', 'Monthly', 'Statement', 'Quarterly', 'Yearly'];

export function BillSheet({ onClose, bill }: { onClose: () => void; bill?: Bill }) {
  const { data, save, remove, notify } = useStore();
  const [kind, setKind] = useState<Bill['kind']>(bill?.kind ?? 'bill');
  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '');
  const [freq, setFreq] = useState<BillFreq>(bill?.freq ?? 'Monthly');
  const [due, setDue] = useState(bill?.due ?? toISO(addDays(today(), 7)));
  const [payerId, setPayerId] = useState(bill?.payerId ?? data.members[0]?.id ?? '');
  const [category, setCategory] = useState(bill?.category ?? '');
  const [lastUsed, setLastUsed] = useState(bill?.lastUsed ?? '');
  const [saving, setSaving] = useState(false);
  const amt = parseMoney(amount);
  const valid = name.trim() && amt > 0 && due;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await save('bills', {
        ...(bill ?? {}), id: bill?.id ?? uid(), name: name.trim(), amount: amt, freq, due, payerId, kind,
        category: category || undefined, lastUsed: kind === 'subscription' && lastUsed ? lastUsed : undefined,
      } satisfies Bill);
      notify(bill ? 'Bill updated' : `${name.trim()} added`);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={bill ? 'Edit bill' : 'Add a bill or subscription'}>
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Segmented label="Kind" options={[{ value: 'bill', label: 'Bill' }, { value: 'subscription', label: 'Subscription' }]} value={kind} onChange={setKind} />
        <Field label="Name"><input id="bill-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Electric" autoFocus={!bill} /></Field>
        <div className="form-grid">
          <Field label="Amount"><input id="bill-amount" className="input num" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Every">
            <select id="bill-freq" className="input" value={freq} onChange={e => setFreq(e.target.value as BillFreq)}>{FREQS.map(f => <option key={f}>{f}</option>)}</select>
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Next due"><input id="bill-due" className="input" type="date" value={due} onChange={e => setDue(e.target.value)} /></Field>
          <Field label="Paid by">
            <select id="bill-payer" className="input" value={payerId} onChange={e => setPayerId(e.target.value)}>{data.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          </Field>
        </div>
        <Field label="Budget category" hint="When you mark it paid, the payment counts toward this budget.">
          <select id="bill-category" className="input" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Not a budget expense (e.g. card payment)</option>
            {data.budgets.map(b => <option key={b.id}>{b.category}</option>)}
          </select>
        </Field>
        {kind === 'subscription' && (
          <Field label="Last used" hint="Unused for 30+ days gets tagged Possibly unused.">
            <input id="bill-used" className="input" type="date" value={lastUsed} onChange={e => setLastUsed(e.target.value)} />
          </Field>
        )}
        <button className="btn-primary big" disabled={!valid || saving}>{saving ? 'Saving…' : bill ? 'Save changes' : 'Add bill'}</button>
        {bill && (
          <ConfirmButton onConfirm={async () => { await remove('bills', bill.id); notify(`${bill.name} deleted`); onClose(); }}>Delete bill</ConfirmButton>
        )}
      </form>
    </Sheet>
  );
}
