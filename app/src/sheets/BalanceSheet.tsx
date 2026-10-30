import { useState } from 'react';
import { Field, Sheet } from '../components/ui';
import { fmtDay, fromISO } from '../lib/dates';
import { parseMoney, signedUsd, usd } from '../lib/format';
import { useStore } from '../store/Store';

export function BalanceSheet({ onClose, accountId }: { onClose: () => void; accountId?: string }) {
  const { data, updateAccount, notify } = useStore();
  const editable = data.accounts.filter(a => !a.linked);
  const [id, setId] = useState(accountId && editable.some(a => a.id === accountId) ? accountId : editable[0]?.id ?? '');
  const acct = data.accounts.find(a => a.id === id);
  const [val, setVal] = useState(acct ? String(acct.value) : '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const v = parseMoney(val);
  const diff = acct && Number.isFinite(v) ? v - acct.value : 0;

  const choose = (nid: string) => {
    setId(nid);
    setVal(String(data.accounts.find(a => a.id === nid)?.value ?? ''));
  };

  const submit = async () => {
    if (!acct || !(v >= 0)) return;
    setSaving(true);
    try {
      await updateAccount(acct.id, Math.round(v), note.trim() || undefined);
      notify(`${acct.name} updated. Net worth recalculated.`);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  if (!editable.length) {
    return (
      <Sheet open onClose={onClose} title="Update value">
        <div className="muted">Add accounts in Net Worth first.</div>
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} title="Update value">
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Account">
          <select id="bal-account" className="input" value={id} onChange={e => choose(e.target.value)}>
            {editable.map(a => <option key={a.id} value={a.id}>{a.name} · {a.kind === 'asset' ? 'Asset' : 'Liability'}</option>)}
          </select>
        </Field>
        {acct && (
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <div>
              <div style={{ fontSize: 16 }}>{acct.name}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{acct.note}{acct.updatedAt ? ` · updated ${fmtDay(fromISO(acct.updatedAt))}` : ''}</div>
            </div>
            <span className="num muted" style={{ fontSize: 16 }}>{usd(acct.value)}</span>
          </div>
        )}
        <Field label="New balance">
          <input id="bal-value" className="input big-input num" inputMode="decimal" value={val} onChange={e => setVal(e.target.value)} autoFocus />
        </Field>
        {acct && Number.isFinite(v) && diff !== 0 && (
          <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, padding: '0 4px' }}>
            <span className="muted">Change</span>
            <span style={{ color: (acct.kind === 'asset') === diff > 0 ? 'var(--green)' : 'var(--orange)' }}>
              {signedUsd(diff)}{acct.value ? ` · ${diff > 0 ? '+' : ''}${((diff / acct.value) * 100).toFixed(1)}%` : ''}
            </span>
          </div>
        )}
        <Field label="Note"><input id="bal-note" className="input" value={note} onChange={e => setNote(e.target.value)} placeholder={acct?.note || 'e.g. From October statement'} /></Field>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>Net worth recalculates as soon as you save. Past values stay on the trend line.</div>
        <button className="btn-primary big" disabled={!(v >= 0) || saving}>{saving ? 'Saving…' : 'Save balance'}</button>
      </form>
    </Sheet>
  );
}
