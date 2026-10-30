import type { ReactNode } from 'react';
import type { Route } from '../router';
import { TAB_FOR } from '../router';
import { BillsIcon, CoachIcon, GaugeIcon, HomeIcon, PlusIcon, WasteIcon } from './Icons';

const TABS: { id: Route; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <HomeIcon /> },
  { id: 'waste', label: 'Waste', icon: <WasteIcon /> },
  { id: 'networth', label: 'Net Worth', icon: <GaugeIcon /> },
  { id: 'bills', label: 'Bills', icon: <BillsIcon /> },
  { id: 'coach', label: 'Coach', icon: <CoachIcon /> },
];

const MORE: { id: Route; label: string }[] = [
  { id: 'business', label: 'Business' },
  { id: 'retirement', label: 'Retirement' },
  { id: 'budget', label: 'Budget' },
  { id: 'prefs', label: 'Settings' },
];

interface NavProps {
  route: Route;
  go: (r: Route) => void;
  onAdd: () => void;
  badges: Partial<Record<Route, ReactNode>>;
  household: string;
}

/** Phone: bottom tab bar + floating add. Wide screens: sidebar. */
export function Nav({ route, go, onAdd, badges, household }: NavProps) {
  const active = TAB_FOR[route];
  return (
    <>
      <div className="tabbar-wrap">
        <button className="fab" aria-label="Add a transaction or balance" onClick={onAdd}><PlusIcon /></button>
        <nav className="tabbar" aria-label="Main">
          {TABS.map(t => (
            <button key={t.id} className="tab" aria-current={t.id === active ? 'page' : undefined} onClick={() => go(t.id)}>
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <aside className="sidebar" aria-label="Main">
        <div className="brand"><span className="brand-mark" />Reclaim</div>
        {TABS.map(t => (
          <button key={t.id} className="side-item" aria-current={t.id === route || (t.id === active && !MORE.some(m => m.id === route)) ? 'page' : undefined} onClick={() => go(t.id)}>
            {t.label}{badges[t.id]}
          </button>
        ))}
        <div className="side-rule" />
        {MORE.map(t => (
          <button key={t.id} className="side-item" aria-current={t.id === route ? 'page' : undefined} onClick={() => go(t.id)}>{t.label}</button>
        ))}
        <button className="btn-primary" style={{ marginTop: 18, height: 44 }} onClick={onAdd}>+ Add</button>
        <div className="muted" style={{ marginTop: 'auto', fontSize: 13, padding: '0 12px' }}>{household}</div>
      </aside>
    </>
  );
}
