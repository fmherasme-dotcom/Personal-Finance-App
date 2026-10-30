import { useState } from 'react';
import { Avatar, ConfirmButton, Field, Header, Row, Segmented, SectionHead, Toggle } from '../components/ui';
import { DAY_NAMES } from '../lib/dates';
import { perMonth } from '../lib/finance';
import { uid, usd } from '../lib/format';
import type { Route } from '../router';
import { useSheet } from '../sheets/SheetHost';
import { EXTRA_CATEGORIES } from '../sheets/TransactionSheet';
import { cfg } from '../store/derive';
import { usePrefs } from '../store/prefs';
import { useStore } from '../store/Store';
import type { Rule, Source } from '../store/types';
import { SOURCES } from '../store/types';
import { useTheme } from '../theme';
import { fmtTime } from './Coach';

export function Settings({ go }: { go: (r: Route) => void }) {
  const { data, saveConfig, resetAll, notify, backendKind } = useStore();
  const { prefs, setPref } = usePrefs();
  const { theme, set } = useTheme();
  const open = useSheet();
  const c = cfg(data);
  const me = data.members.find(m => m.id === prefs.meId) ?? data.members.find(m => m.role === 'Owner') ?? data.members[0];
  const members = [...data.members].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const budgetTotal = data.budgets.reduce((s, b) => s + b.amount, 0);
  const [household, setHousehold] = useState(c.household);
  const [resetting, setResetting] = useState(false);

  return (
    <div className="screen with-tabs">
      <Header back={{ label: 'Home', onClick: () => go('home') }} title="Settings" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 0' }}>
        <Avatar name={me?.name ?? '?'} size={56} active />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18 }}>{me?.name ?? 'No members yet'}</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{me?.role} · {c.household}</div>
        </div>
      </div>
      <Field label="This device belongs to" hint="Sets whose spending the Personal view shows. Saved on this device only.">
        <select id="set-me" className="input" value={me?.id ?? ''} onChange={e => setPref('meId', e.target.value)}>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>

      {c.example && (
        <div className="card" style={{ boxShadow: 'inset 0 0 0 1px rgba(212,162,76,.35)' }}>
          <div className="eyebrow amber">EXAMPLE DATA</div>
          <div style={{ fontSize: 15, lineHeight: 1.5, marginTop: 8 }}>Everything here is a sample household so you can try each feature. When you're ready, clear it and set up your own household. This can't be undone.</div>
          <ConfirmButton className="btn-primary big" style={{ marginTop: 14, width: '100%' }} confirmText="Tap again to erase the example data"
            onConfirm={async () => { setResetting(true); await resetAll(); setResetting(false); window.location.hash = 'home'; }}>
            {resetting ? 'Clearing…' : 'Start fresh with my own numbers'}
          </ConfirmButton>
        </div>
      )}

      <SectionHead>HOUSEHOLD &amp; PERMISSIONS</SectionHead>
      <div className="card list">
        <div className="list-row" style={{ gap: 12 }}>
          <input id="set-household" className="input" style={{ flex: 1 }} value={household} onChange={e => setHousehold(e.target.value)} aria-label="Household name"
            onBlur={() => household.trim() && household !== c.household && saveConfig({ household: household.trim() }).then(() => notify('Household name saved'))} />
        </div>
        {members.map(m => <Row key={m.id} label={m.name} value={m.role} onClick={() => open({ type: 'member', member: m })} />)}
        <button className="list-row row amber" onClick={() => open({ type: 'member' })}>Invite member</button>
      </div>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45, padding: '0 4px' }}>To let family members open Reclaim, share this page with them from its Share menu: Contributor to add and change things, Viewer to only look.</div>

      <SectionHead>MONEY</SectionHead>
      <div className="card list">
        <Row border={false} label="Categories & budgets" value={`${data.budgets.length} · ${usd(budgetTotal)}/mo`} onClick={() => go('budget')} />
        <Row label="Category rules" value={String(data.rules.length)} onClick={() => go('rules')} />
        <Row label="Retirement goal" value={`${new Date(c.goal.year, c.goal.month, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })} · ${usd(c.goal.monthlyIncome)}/mo`} onClick={() => open({ type: 'goal' })} />
      </div>
      <SectionHead right={<button className="link-sm" onClick={() => open({ type: 'income' })}>+ Add</button>}>INCOME SOURCES</SectionHead>
      <div className="card list">
        {data.income.length === 0 && <div className="muted" style={{ padding: '14px 0', fontSize: 14 }}>None yet.</div>}
        {data.income.map(i => <Row key={i.id} label={<span>{i.label}<span className="muted" style={{ display: 'block', fontSize: 13 }}>{i.source}</span></span>} value={`${usd(i.amount)}/${i.freq === 'week' ? 'wk' : 'mo'}`} onClick={() => open({ type: 'income', income: i })} />)}
        {data.income.length > 0 && <div className="list-row row num"><span className="muted">Expected per month</span><span>{usd(data.income.reduce((s, i) => s + perMonth(i.amount, i.freq), 0))}</span></div>}
      </div>
      <div className="form-grid">
        <Field label="Savings account"><input id="set-sav" className="input" defaultValue={c.savingsAccount} onBlur={e => e.target.value.trim() && e.target.value !== c.savingsAccount && saveConfig({ savingsAccount: e.target.value.trim() })} /></Field>
        <Field label="Investment account"><input id="set-inv" className="input" defaultValue={c.investAccount} onBlur={e => e.target.value.trim() && e.target.value !== c.investAccount && saveConfig({ investAccount: e.target.value.trim() })} /></Field>
      </div>

      <SectionHead>WEEKLY REVIEW</SectionHead>
      <div className="card list">
        <div className="list-row"><span>Review day</span>
          <select className="input slim" value={c.reviewDay} onChange={e => saveConfig({ reviewDay: e.target.value })} aria-label="Review day">{DAY_NAMES.map(d => <option key={d}>{d}</option>)}</select>
        </div>
        <div className="list-row row"><span>Reminder time</span>
          <input className="input slim" type="time" value={c.reminderTime} onChange={e => e.target.value && saveConfig({ reminderTime: e.target.value })} aria-label="Reminder time" />
        </div>
        <div className="list-row row"><span>Remind me<span className="muted" style={{ display: 'block', fontSize: 13 }}>Shows on Home when your {c.reviewDay} {fmtTime(c.reminderTime)} review is due</span></span>
          <Toggle label="Remind me" on={c.remind} onChange={v => saveConfig({ remind: v })} />
        </div>
      </div>

      <SectionHead>APPEARANCE</SectionHead>
      <Segmented label="Theme" options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} value={theme} onChange={set} />

      <SectionHead>PRIVACY</SectionHead>
      <div className="card list">
        <div className="list-row"><span>Hide balances<span className="muted" style={{ display: 'block', fontSize: 13 }}>Shows ••••• until you tap. This device only.</span></span>
          <Toggle label="Hide balances" on={prefs.hideBalances} onChange={v => setPref('hideBalances', v)} />
        </div>
        <div className="list-row row"><span>Face ID lock<span className="muted" style={{ display: 'block', fontSize: 13 }}>Needs the iPhone app. Your data is private to people you share this page with.</span></span>
          <Toggle label="Face ID lock" on={false} onChange={() => notify('Face ID lock comes with the iPhone app')} />
        </div>
      </div>
      <div className="muted" style={{ fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
        {backendKind === 'db' ? 'Saved to your household’s private Reclaim database.' : 'Saved in this browser only.'}
      </div>
      {!c.example && (
        <ConfirmButton confirmText="Tap again to erase everything" onConfirm={async () => { await resetAll(); window.location.hash = 'home'; }}>Erase all household data</ConfirmButton>
      )}
    </div>
  );
}

export function Rules({ go }: { go: (r: Route) => void }) {
  const { data, save, remove, notify } = useStore();
  const [match, setMatch] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState<Source>('Personal');
  const cats = [...data.budgets.map(b => b.category), ...EXTRA_CATEGORIES].filter((v, i, a) => a.indexOf(v) === i);
  const hits = match.trim() ? data.transactions.filter(t => (t.vendor ?? '').toLowerCase().includes(match.trim().toLowerCase())) : [];

  const add = async () => {
    if (!match.trim() || !category) return;
    await save('rules', { id: uid(), match: match.trim(), category, source } satisfies Rule);
    // Re-sort past matches too.
    for (const t of hits) if (t.category !== category || t.source !== source) await save('transactions', { ...t, category, source });
    notify(`Rule saved${hits.length ? `, ${hits.length} past transaction${hits.length > 1 ? 's' : ''} updated` : ''}`);
    setMatch(''); setCategory('');
  };

  return (
    <div className="screen with-tabs">
      <Header back={{ label: 'Settings', onClick: () => go('prefs') }} title="Category rules" />
      <div className="card" style={{ background: 'var(--s2)', boxShadow: 'inset 0 0 0 1px rgba(212,162,76,.35)', padding: 16 }}>
        <div className="eyebrow amber">NEW RULE</div>
        <form onSubmit={e => { e.preventDefault(); add(); }} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <div className="rule-line"><span className="muted">If vendor contains</span><input id="rule-match" className="input" value={match} onChange={e => setMatch(e.target.value)} placeholder="Fieldline" /></div>
          <div className="rule-line"><span className="muted">Then</span>
            <select id="rule-cat" className="input" value={category} onChange={e => setCategory(e.target.value)}><option value="">Category…</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
            <select id="rule-src" className="input" value={source} onChange={e => setSource(e.target.value as Source)}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>{match.trim() ? `Matches ${hits.length} past transaction${hits.length === 1 ? '' : 's'}` : 'Applies when you type a vendor in a new transaction.'}</div>
          <button className="btn-primary" style={{ height: 46, borderRadius: 12 }} disabled={!match.trim() || !category}>Save rule</button>
        </form>
      </div>
      <SectionHead>ACTIVE · {data.rules.length}</SectionHead>
      <div className="card list">
        {data.rules.length === 0 && <div className="muted" style={{ padding: '14px 0', fontSize: 14 }}>No rules yet.</div>}
        {data.rules.map(r => (
          <div key={r.id} className="row" style={{ padding: '13px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15 }}>Vendor contains "{r.match}"</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>→ {r.category} · {r.source}</div>
            </div>
            <ConfirmButton className="btn-ghost sm" confirmText="Delete?" onConfirm={() => remove('rules', r.id)}>Remove</ConfirmButton>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Import({ go }: { go: (r: Route) => void }) {
  const { prefs, setPref } = usePrefs();
  const open = useSheet();
  return (
    <div className="screen with-tabs">
      <Header back={{ label: 'Home', onClick: () => go('home') }} title={<span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>Import <span className="tag" style={{ background: 'rgba(212,162,76,.14)', color: 'var(--amber)', fontSize: 12 }}>Coming soon</span></span>} />
      <div className="import-drop" aria-disabled="true">
        <span className="muted" style={{ display: 'flex' }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 15v4h14v-4" /></svg>
        </span>
        <div className="muted" style={{ fontSize: 16 }}>CSV or bank statement PDF</div>
        <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: 'var(--faint)' }}>.csv · .ofx · .pdf</div>
      </div>
      <div style={{ fontSize: 16, lineHeight: 1.5 }}>Statement import is in the works. This version doesn't connect to your banks, so everything you add stays under your control.</div>
      <div className="muted" style={{ fontSize: 15, lineHeight: 1.5 }}>Until then, add transactions by hand and set category rules so they sort themselves.</div>
      <div className="card list"><div className="list-row"><span>Tell me when it's ready</span><Toggle label="Tell me when it's ready" on={prefs.notifyImport} onChange={v => setPref('notifyImport', v)} /></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button className="btn-primary big" onClick={() => open({ type: 'transaction' })}>Add transaction</button>
        <button className="btn-secondary big" onClick={() => go('rules')}>Category rules</button>
      </div>
    </div>
  );
}
