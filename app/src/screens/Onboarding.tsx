import { useState } from 'react';
import { Gauge } from '../components/Gauge';
import { BackIcon } from '../components/Icons';
import { Avatar, Field, Segmented, Tag } from '../components/ui';
import { today } from '../lib/dates';
import { perMonth } from '../lib/finance';
import { parseMoney, uid, usd } from '../lib/format';
import { usePrefs } from '../store/prefs';
import { useStore } from '../store/Store';
import type { IncomeSource, Member, Role, Source } from '../store/types';
import { DEFAULT_CONFIG, SOURCES } from '../store/types';
import { GoalEditor } from '../sheets/GoalSheet';
import { ROLE_HELP } from '../sheets/HouseholdSheets';

const DEFAULT_BUDGETS: [string, number][] = [
  ['Housing', 4300], ['Travel', 2500], ['Groceries', 1400], ['Dining out', 600], ['Shopping', 800],
  ['Utilities', 700], ['Auto & fuel', 450], ['Health & fitness', 250], ['Gifts', 300], ['Entertainment', 120],
];

type Step = 0 | 1 | 2 | 3;

export function Onboarding() {
  const { save, saveConfig, notify } = useStore();
  const { setPref } = usePrefs();
  const [step, setStep] = useState<Step>(0);
  const [household, setHousehold] = useState('');
  const [members, setMembers] = useState<Member[]>([{ id: uid(), name: '', relation: 'You · Head of household', role: 'Owner', order: 0 }]);
  const [income, setIncome] = useState<IncomeSource[]>([
    { id: uid(), label: 'Restoration · Owner draw', source: 'Business A', amount: 0, freq: 'week' },
    { id: uid(), label: 'Cigar Brand · Distribution', source: 'Business B', amount: 0, freq: 'week' },
  ]);
  const [goal, setGoal] = useState({ year: new Date().getFullYear() + 5, month: 4, income: 18000 });
  const [invited, setInvited] = useState(false);
  const [saving, setSaving] = useState(false);

  const weekly = income.reduce((s, i) => s + (i.freq === 'week' ? i.amount : (perMonth(i.amount, 'Monthly') * 12) / 52), 0);
  const me = members[0];

  const finish = async () => {
    setSaving(true);
    try {
      const ms = members.filter(m => m.name.trim()).map((m, i) => ({ ...m, name: m.name.trim(), order: i }));
      for (const m of ms) await save('members', m);
      for (const i of income.filter(x => x.amount > 0)) await save('income', i);
      for (const [category, amount] of DEFAULT_BUDGETS) await save('budgets', { id: category.toLowerCase().replace(/[^a-z0-9]+/g, '-'), category, amount });
      await save('meta', { id: 'history', netWorth: [], drawsA: {}, drawsB: {} });
      await saveConfig({
        ...DEFAULT_CONFIG,
        onboarded: true,
        example: false,
        household: household.trim() || `${(ms[0]?.name.split(' ').slice(-1)[0] ?? 'My')} household`,
        goal: { year: goal.year, month: goal.month, monthlyIncome: goal.income, number: Math.round((goal.income * 12) / 0.04 / 50000) * 50000 },
        reclaimedBaseYear: today().getFullYear(),
      });
      if (ms[0]) setPref('meId', ms[0].id);
      notify('Household set up. Add your accounts in Net Worth.');
      window.location.hash = 'home';
    } catch {
      setSaving(false);
    }
  };

  if (step === 0) {
    return (
      <div className="screen onboard">
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(420px 320px at 50% 30%, rgba(212,162,76,.10), transparent 70%)', pointerEvents: 'none' }} />
        <div className="brand" style={{ position: 'relative', padding: 0 }}><span className="brand-mark" />Reclaim</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28, position: 'relative' }}>
          <Gauge pct={0.72} size={250} thickness={6} text="15 min" numSize={46} label="Once a week" sub="Sunday evening review" />
        </div>
        <div style={{ marginTop: 24, fontSize: 40, lineHeight: 1.08, letterSpacing: '-.025em', position: 'relative' }}>Find the leaks.<br /><span className="amber">Fund the future.</span></div>
        <div className="muted" style={{ fontSize: 16, lineHeight: 1.5, position: 'relative' }}>Reclaim spots wasted money across your household and both businesses, shows what it costs you, and moves it into savings and investments.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, position: 'relative' }}>
          <button className="btn-primary big" onClick={() => setStep(1)}>Set up my household</button>
          <button className="btn-ghost" onClick={() => setInvited(v => !v)}>I was invited by a family member</button>
          {invited && <div className="card muted" style={{ fontSize: 14, lineHeight: 1.5 }}>Ask the person who set up Reclaim to share this page with you from its Share menu. Once they have, the household's data appears here automatically.</div>}
        </div>
      </div>
    );
  }

  const header = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
        <button className="icon-btn" aria-label="Back" onClick={() => setStep((step - 1) as Step)}><BackIcon /></button>
        <span className="muted" style={{ fontSize: 14 }}>Step {step} of 3</span>
        <span style={{ width: 36 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
        {[1, 2, 3].map(i => <div key={i} style={{ height: 3, borderRadius: 2, background: i <= step ? 'var(--amber)' : 'var(--line)' }} />)}
      </div>
    </>
  );

  if (step === 1) {
    const setM = (id: string, patch: Partial<Member>) => setMembers(ms => ms.map(m => (m.id === id ? { ...m, ...patch } : m)));
    return (
      <div className="screen onboard">
        {header}
        <h1 className="title" style={{ marginTop: 12 }}>Who's in the household?</h1>
        <div className="muted" style={{ fontSize: 15, lineHeight: 1.45, marginTop: -6 }}>Everyone gets a personal view. Owners see the businesses.</div>
        <Field label="Household name"><input id="ob-household" className="input" value={household} onChange={e => setHousehold(e.target.value)} placeholder="e.g. Reyes household" /></Field>
        {members.map((m, i) => (
          <div key={m.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, ...(i === 0 ? {} : { background: 'var(--s2)' }) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={m.name || '?'} size={44} active={i === 0} />
              <input className="input" style={{ flex: 1 }} value={m.name} onChange={e => setM(m.id, { name: e.target.value })} placeholder={i === 0 ? 'Your full name' : 'Full name'} aria-label="Name" autoFocus={i === 0} />
              {i === 0 ? <Tag bg="rgba(212,162,76,.14)" color="var(--amber)">Owner</Tag> : <button className="icon-btn" aria-label="Remove" onClick={() => setMembers(ms => ms.filter(x => x.id !== m.id))}>×</button>}
            </div>
            {i > 0 && (
              <>
                <input className="input" value={m.relation} onChange={e => setM(m.id, { relation: e.target.value })} placeholder="Relationship, e.g. Spouse" aria-label="Relationship" />
                <Segmented label="Permission" options={['Owner', 'Member', 'View-only'] as Role[]} value={m.role} onChange={r => setM(m.id, { role: r })} />
                <span className="field-hint">{ROLE_HELP[m.role]}</span>
              </>
            )}
          </div>
        ))}
        <button className="dashed-btn" onClick={() => setMembers(ms => [...ms, { id: uid(), name: '', relation: '', role: 'Member', order: ms.length }])}>+ Add member</button>
        <button className="btn-primary big" style={{ marginTop: 8 }} disabled={!me.name.trim()} onClick={() => setStep(2)}>Continue</button>
      </div>
    );
  }

  if (step === 2) {
    const setI = (id: string, patch: Partial<IncomeSource>) => setIncome(xs => xs.map(x => (x.id === id ? { ...x, ...patch } : x)));
    return (
      <div className="screen onboard">
        {header}
        <h1 className="title" style={{ marginTop: 12 }}>Where does money come in?</h1>
        <div className="muted" style={{ fontSize: 15, lineHeight: 1.45, marginTop: -6 }}>Owner draws are tracked apart from business spending.</div>
        {income.map(i => (
          <div key={i.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select className="input" style={{ width: 140 }} value={i.source} onChange={e => setI(i.id, { source: e.target.value as Source })} aria-label="Source">{SOURCES.map(s => <option key={s}>{s}</option>)}</select>
              <input className="input" style={{ flex: 1, minWidth: 0 }} value={i.label} onChange={e => setI(i.id, { label: e.target.value })} aria-label="Description" />
              <button className="icon-btn" aria-label="Remove" onClick={() => setIncome(xs => xs.filter(x => x.id !== i.id))}>×</button>
            </div>
            <div className="form-grid">
              <input className="input num" inputMode="decimal" value={i.amount || ''} onChange={e => setI(i.id, { amount: parseMoney(e.target.value) || 0 })} placeholder="Amount" aria-label="Amount" />
              <Segmented label="Frequency" options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} value={i.freq} onChange={f => setI(i.id, { freq: f })} />
            </div>
          </div>
        ))}
        <button className="dashed-btn" onClick={() => setIncome(xs => [...xs, { id: uid(), label: '', source: 'Personal', amount: 0, freq: 'week' }])}>+ Add income source</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 4px 0' }}>
          <span className="muted" style={{ fontSize: 15 }}>Expected weekly income</span>
          <span className="num amber" style={{ fontSize: 22, fontWeight: 300 }}>{usd(weekly)}</span>
        </div>
        <button className="btn-primary big" onClick={() => setStep(3)}>Continue</button>
      </div>
    );
  }

  return (
    <div className="screen onboard">
      {header}
      <h1 className="title" style={{ marginTop: 12 }}>When do you want to step back?</h1>
      <div className="muted" style={{ fontSize: 15, lineHeight: 1.45, marginTop: -6 }}>Every reclaimed dollar is measured against this goal.</div>
      <GoalEditor year={goal.year} month={goal.month} income={goal.income} onYear={y => setGoal(g => ({ ...g, year: y }))} onMonth={m => setGoal(g => ({ ...g, month: m }))} onIncome={v => setGoal(g => ({ ...g, income: v }))} />
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>Your number starts at {usd(Math.round((goal.income * 12) / 0.04 / 50000) * 50000)} (enough to draw {usd(goal.income)}/mo at 4% a year). You can change it later.</div>
      <button className="btn-primary big" disabled={saving} onClick={finish}>{saving ? 'Setting up…' : 'Start my first weekly review'}</button>
    </div>
  );
}
