import { useState } from 'react';
import { ConfirmButton, Field, Segmented, Sheet } from '../components/ui';
import { parseMoney, slug, uid } from '../lib/format';
import { useStore } from '../store/Store';
import type { Budget, IncomeSource, Member, Role, Source } from '../store/types';
import { SOURCES } from '../store/types';

export const ROLE_HELP: Record<Role, string> = {
  Owner: 'Sees everything, including both businesses.',
  Member: 'Adds transactions. No business accounts.',
  'View-only': 'Can look, but not change anything.',
};

export function MemberSheet({ onClose, member }: { onClose: () => void; member?: Member }) {
  const { data, save, remove, notify } = useStore();
  const [name, setName] = useState(member?.name ?? '');
  const [relation, setRelation] = useState(member?.relation ?? '');
  const [role, setRole] = useState<Role>(member?.role ?? 'Member');
  const owners = data.members.filter(m => m.role === 'Owner');
  const lastOwner = member?.role === 'Owner' && owners.length === 1;

  const submit = async () => {
    if (!name.trim()) return;
    await save('members', { id: member?.id ?? uid(), name: name.trim(), relation: relation.trim(), role: lastOwner ? 'Owner' : role, order: member?.order ?? data.members.length } satisfies Member);
    notify(member ? `${name.trim()} updated` : `${name.trim()} added`);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={member ? 'Edit member' : 'Add member'}>
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Name"><input id="m-name" className="input" value={name} onChange={e => setName(e.target.value)} autoFocus={!member} /></Field>
        <Field label="Relationship"><input id="m-rel" className="input" value={relation} onChange={e => setRelation(e.target.value)} placeholder="e.g. Spouse" /></Field>
        <div className="field">
          <span className="field-label">Permission</span>
          <Segmented label="Permission" options={['Owner', 'Member', 'View-only'] as const} value={role} onChange={r => !lastOwner && setRole(r)} />
          <span className="field-hint">{lastOwner ? 'The household needs at least one owner.' : ROLE_HELP[role]}</span>
        </div>
        <button className="btn-primary big" disabled={!name.trim()}>{member ? 'Save member' : 'Add member'}</button>
        {member && !lastOwner && <ConfirmButton onConfirm={async () => { await remove('members', member.id); notify(`${member.name} removed`); onClose(); }}>Remove from household</ConfirmButton>}
      </form>
    </Sheet>
  );
}

export function IncomeSheet({ onClose, income }: { onClose: () => void; income?: IncomeSource }) {
  const { save, remove, notify } = useStore();
  const [label, setLabel] = useState(income?.label ?? '');
  const [source, setSource] = useState<Source>(income?.source ?? 'Business A');
  const [amount, setAmount] = useState(income ? String(income.amount) : '');
  const [freq, setFreq] = useState<'week' | 'month'>(income?.freq ?? 'week');
  const amt = parseMoney(amount);

  const submit = async () => {
    if (!label.trim() || !(amt > 0)) return;
    await save('income', { id: income?.id ?? uid(), label: label.trim(), source, amount: amt, freq } satisfies IncomeSource);
    notify(income ? 'Income source updated' : 'Income source added');
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={income ? 'Edit income source' : 'Add income source'}>
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field"><span className="field-label">Comes from</span><Segmented label="Source" options={SOURCES} value={source} onChange={setSource} /></div>
        <Field label="Description"><input id="inc-label" className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder={source === 'Personal' ? 'e.g. Consulting' : 'e.g. Owner draw'} /></Field>
        <div className="form-grid">
          <Field label="Amount"><input id="inc-amount" className="input num" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
          <div className="field"><span className="field-label">Every</span><Segmented label="Frequency" options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} value={freq} onChange={setFreq} /></div>
        </div>
        <button className="btn-primary big" disabled={!label.trim() || !(amt > 0)}>{income ? 'Save' : 'Add income source'}</button>
        {income && <ConfirmButton onConfirm={async () => { await remove('income', income.id); onClose(); }}>Delete income source</ConfirmButton>}
      </form>
    </Sheet>
  );
}

export function BudgetSheet({ onClose, budget }: { onClose: () => void; budget?: Budget }) {
  const { data, save, remove, notify } = useStore();
  const [category, setCategory] = useState(budget?.category ?? '');
  const [amount, setAmount] = useState(budget ? String(budget.amount) : '');
  const amt = parseMoney(amount);
  const dup = !budget && data.budgets.some(b => b.category.toLowerCase() === category.trim().toLowerCase());

  const submit = async () => {
    if (!category.trim() || !(amt >= 0) || dup) return;
    await save('budgets', { id: budget?.id ?? slug(category), category: budget?.category ?? category.trim(), amount: amt } satisfies Budget);
    notify(budget ? `${budget.category} budget updated` : `${category.trim()} added`);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={budget ? budget.category : 'New category'}>
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!budget && <Field label="Category" hint={dup ? 'That category already exists.' : undefined}><input id="b-cat" className="input" value={category} onChange={e => setCategory(e.target.value)} autoFocus /></Field>}
        <Field label="Monthly budget"><input id="b-amount" className="input num big-input" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} autoFocus={!!budget} /></Field>
        <button className="btn-primary big" disabled={!category.trim() || !(amt >= 0) || dup}>Save budget</button>
        {budget && <ConfirmButton onConfirm={async () => { await remove('budgets', budget.id); onClose(); }}>Delete category</ConfirmButton>}
      </form>
    </Sheet>
  );
}
