import { useState } from 'react';
import { Field, Sheet } from '../components/ui';
import { monthShort, runway } from '../lib/dates';
import { parseMoney, usd } from '../lib/format';
import { cfg } from '../store/derive';
import { useStore } from '../store/Store';

export function GoalEditor({ year, month, income, onYear, onMonth, onIncome }: { year: number; month: number; income: number; onYear: (y: number) => void; onMonth: (m: number) => void; onIncome: (v: number) => void }) {
  const now = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => Math.max(now + 1, year - 2) + i);
  const r = runway(new Date(year, month, 1));
  return (
    <>
      <div className="card" style={{ padding: '22px 18px' }}>
        <div className="eyebrow">SEMI-RETIREMENT DATE</div>
        <div style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-.02em', marginTop: 8 }}>{monthShort(month)} {year}</div>
        <div className="amber" style={{ fontSize: 15, marginTop: 4 }}>{r.text} from today</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginTop: 18 }}>
          {years.map(y => (
            <button key={y} type="button" className="year-chip" aria-pressed={y === year} onClick={() => onYear(y)}>{y}</button>
          ))}
        </div>
        <select className="input" style={{ marginTop: 10 }} value={month} onChange={e => onMonth(Number(e.target.value))} aria-label="Month">
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}</option>)}
        </select>
      </div>
      <div className="card" style={{ padding: '22px 18px' }}>
        <div className="eyebrow">TARGET MONTHLY INCOME</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
          <span className="num" style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-.02em' }}>{usd(income)}</span>
          <span className="muted" style={{ fontSize: 16 }}>/ mo</span>
        </div>
        <input type="range" min={5000} max={30000} step={500} value={income} onChange={e => onIncome(Number(e.target.value))} aria-label="Target monthly income" style={{ width: '100%', margin: '16px 0 6px' }} />
        <div className="num muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>$5,000</span><span>$30,000</span></div>
        <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>Before taxes, in today's dollars.</div>
      </div>
    </>
  );
}

export function GoalSheet({ onClose }: { onClose: () => void }) {
  const { data, saveConfig, notify } = useStore();
  const c = cfg(data);
  const [year, setYear] = useState(c.goal.year);
  const [month, setMonth] = useState(c.goal.month);
  const [income, setIncome] = useState(c.goal.monthlyIncome);
  const [number, setNumber] = useState(String(c.goal.number));
  const [contrib, setContrib] = useState(String(c.monthlyContribution));
  const [rate, setRate] = useState(String(Math.round(c.returnRate * 1000) / 10));

  const submit = async () => {
    const n = parseMoney(number), k = parseMoney(contrib), r = parseMoney(rate);
    if (!(n > 0) || !(k >= 0) || !(r >= 0)) return;
    await saveConfig({ goal: { year, month, monthlyIncome: income, number: n }, monthlyContribution: k, returnRate: r / 100 });
    notify('Retirement goal saved');
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Semi-retirement goal">
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <GoalEditor year={year} month={month} income={income} onYear={setYear} onMonth={setMonth} onIncome={setIncome} />
        <Field label="Your number (net worth needed)" hint="The arc on Home and Net Worth shows progress toward this.">
          <input id="g-number" className="input num" inputMode="decimal" value={number} onChange={e => setNumber(e.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="You invest per month"><input id="g-contrib" className="input num" inputMode="decimal" value={contrib} onChange={e => setContrib(e.target.value)} /></Field>
          <Field label="Expected return %"><input id="g-rate" className="input num" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} /></Field>
        </div>
        <button className="btn-primary big">Save goal</button>
      </form>
    </Sheet>
  );
}
