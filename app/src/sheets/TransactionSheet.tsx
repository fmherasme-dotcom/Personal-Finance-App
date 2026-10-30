import { useMemo, useState } from 'react';
import { Avatar, Field, Segmented, Sheet } from '../components/ui';
import { todayISO } from '../lib/dates';
import { parseMoney, usd } from '../lib/format';
import { usePrefs } from '../store/prefs';
import { useStore } from '../store/Store';
import type { Source } from '../store/types';
import { SOURCES } from '../store/types';

export const INCOME_CATEGORIES = ['Owner draw', 'Salary', 'Consulting', 'Other income'];
export const EXTRA_CATEGORIES = ['Software', 'Equipment', 'Inventory', 'Other'];

export function TransactionSheet({ onClose, preset }: { onClose: () => void; preset?: { category?: string; source?: string } }) {
  const { data, addTransaction, notify } = useStore();
  const { prefs } = usePrefs();
  const me = prefs.meId ?? data.members.find(m => m.role === 'Owner')?.id ?? data.members[0]?.id ?? '';
  const [type, setType] = useState<'expense' | 'income'>(preset?.category && INCOME_CATEGORIES.includes(preset.category) ? 'income' : 'expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState(preset?.category ?? '');
  const [account, setAccount] = useState('Household checking');
  const [personId, setPersonId] = useState(me);
  const [source, setSource] = useState<Source>((preset?.source as Source) ?? 'Personal');
  const [vendor, setVendor] = useState('');
  const [note, setNote] = useState('');
  const [ruleHit, setRuleHit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => {
    const base = type === 'income' ? INCOME_CATEGORIES : [...data.budgets.map(b => b.category).sort(), ...EXTRA_CATEGORIES.filter(c => !data.budgets.some(b => b.category === c))];
    return base;
  }, [type, data.budgets]);
  const accounts = useMemo(() => ['Household checking', ...data.accounts.filter(a => !a.linked).map(a => a.name), 'Cash'].filter((v, i, a) => a.indexOf(v) === i), [data.accounts]);

  const onVendor = (v: string) => {
    setVendor(v);
    const hit = v.trim() && data.rules.find(r => v.toLowerCase().includes(r.match.toLowerCase()));
    if (hit) {
      setCategory(hit.category);
      setSource(hit.source);
      setRuleHit(`Rule applied: ${hit.category} · ${hit.source}`);
    } else setRuleHit(null);
  };

  const value = parseMoney(amount);
  const valid = value > 0 && !!category && !!personId;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await addTransaction({ date, type, amount: Math.round(value * 100) / 100, category, account, personId, source, vendor: vendor.trim() || undefined, note: note.trim() || undefined });
      notify(`${type === 'income' ? 'Income' : 'Expense'} of ${usd(value)} saved`);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="New transaction">
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Segmented label="Type" options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} value={type} onChange={t => { setType(t); setCategory(''); }} />
        <div className="amount-input">
          <span className="muted">$</span>
          <input id="tx-amount" inputMode="decimal" placeholder="0.00" autoFocus value={amount} onChange={e => setAmount(e.target.value)} aria-label="Amount" />
        </div>
        <Field label="Vendor" hint={ruleHit}>
          <input id="tx-vendor" className="input" value={vendor} onChange={e => onVendor(e.target.value)} placeholder="e.g. Summit Athletic" />
        </Field>
        <div className="form-grid">
          <Field label="Date"><input id="tx-date" className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="Category">
            <select id="tx-category" className="input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Choose…</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Account">
          <select id="tx-account" className="input" value={account} onChange={e => setAccount(e.target.value)}>
            {accounts.map(a => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <div className="field">
          <span className="field-label">Person</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.members.map(m => (
              <button type="button" key={m.id} className="person-chip" aria-pressed={m.id === personId} onClick={() => setPersonId(m.id)}>
                <Avatar name={m.name} size={28} active={m.id === personId} />{m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Source</span>
          <Segmented label="Source" options={SOURCES} value={source} onChange={setSource} />
        </div>
        <Field label="Note"><input id="tx-note" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></Field>
        <button className="btn-primary big" disabled={!valid || saving}>{saving ? 'Saving…' : 'Save transaction'}</button>
      </form>
    </Sheet>
  );
}
