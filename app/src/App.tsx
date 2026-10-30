import { useState } from 'react';
import { Gauge } from './components/Gauge';
import { Nav } from './components/TabBar';
import { Sheet } from './components/ui';
import { useRoute, type Route } from './router';
import { Bills } from './screens/Bills';
import { Budget } from './screens/Budget';
import { Business } from './screens/Business';
import { Coach } from './screens/Coach';
import { Home } from './screens/Home';
import { NetWorth } from './screens/NetWorth';
import { Onboarding } from './screens/Onboarding';
import { Portfolio } from './screens/Portfolio';
import { Retirement } from './screens/Retirement';
import { Import, Rules, Settings } from './screens/Settings';
import { Waste } from './screens/Waste';
import { SheetHost, useSheet } from './sheets/SheetHost';
import { billsSummary, cfg, wasteSummary } from './store/derive';
import { PrefsProvider } from './store/prefs';
import { StoreProvider, useStore } from './store/Store';

function QuickAdd({ onClose, go }: { onClose: () => void; go: (r: Route) => void }) {
  const open = useSheet();
  const pick = (fn: () => void) => { onClose(); fn(); };
  return (
    <Sheet open onClose={onClose} title="Add">
      <button className="radio-card" onClick={() => pick(() => open({ type: 'transaction' }))}>
        <span style={{ flex: 1, textAlign: 'left' }}><span style={{ display: 'block', fontSize: 16 }}>Transaction</span><span className="muted" style={{ fontSize: 13 }}>An expense, owner draw or other income</span></span>›
      </button>
      <button className="radio-card" onClick={() => pick(() => open({ type: 'balance' }))}>
        <span style={{ flex: 1, textAlign: 'left' }}><span style={{ display: 'block', fontSize: 16 }}>Update a balance</span><span className="muted" style={{ fontSize: 13 }}>Cash, mortgage, retirement accounts and more</span></span>›
      </button>
      <button className="radio-card" onClick={() => pick(() => open({ type: 'bill' }))}>
        <span style={{ flex: 1, textAlign: 'left' }}><span style={{ display: 'block', fontSize: 16 }}>Bill or subscription</span><span className="muted" style={{ fontSize: 13 }}>Something that repeats</span></span>›
      </button>
      <button className="radio-card" onClick={() => pick(() => go('import'))}>
        <span style={{ flex: 1, textAlign: 'left' }}><span style={{ display: 'block', fontSize: 16 }}>Import CSV / statement</span><span className="muted" style={{ fontSize: 13 }}>Coming soon</span></span>›
      </button>
    </Sheet>
  );
}

function Shell() {
  const { data, status, toast, error } = useStore();
  const { route, go } = useRoute();
  const [adding, setAdding] = useState(false);

  if (status !== 'ready') {
    return (
      <div className="app splash">
        <Gauge pct={0.62} size={160} thickness={6} text="" numSize={20} ticks />
        <div className="muted" style={{ marginTop: 18, fontSize: 15 }}>{status === 'error' ? `Couldn't load your household. ${error ?? ''}` : 'Opening your household…'}</div>
      </div>
    );
  }

  if (!data.config?.onboarded) {
    return (
      <div className="app">
        <Onboarding />
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  const ws = wasteSummary(data);
  const bills = billsSummary(data);
  const screens: Record<Route, JSX.Element> = {
    home: <Home go={go} />,
    waste: <Waste go={go} />,
    networth: <NetWorth go={go} />,
    portfolio: <Portfolio go={go} />,
    bills: <Bills go={go} />,
    coach: <Coach />,
    business: <Business go={go} />,
    retirement: <Retirement go={go} />,
    budget: <Budget go={go} />,
    prefs: <Settings go={go} />,
    rules: <Rules go={go} />,
    import: <Import go={go} />,
  };

  return (
    <div className="app has-nav">
      <main className="main" key={route}>{screens[route]}</main>
      <Nav route={route} go={go} onAdd={() => setAdding(true)} household={cfg(data).household}
        badges={{ waste: ws.open.length ? <span className="side-badge orange">{ws.open.length}</span> : null, bills: bills.overdue ? <span className="side-dot" /> : null }} />
      {adding && <QuickAdd onClose={() => setAdding(false)} go={go} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export default function App() {
  return (
    <PrefsProvider>
      <StoreProvider>
        <SheetHost>
          <Shell />
        </SheetHost>
      </StoreProvider>
    </PrefsProvider>
  );
}
