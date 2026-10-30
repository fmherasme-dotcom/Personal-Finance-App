// Per-viewer preferences kept in this browser only (never shared with the household).
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export interface Prefs {
  hideBalances: boolean;
  meId: string | null;
  scope: 'household' | 'personal';
  notifyImport: boolean;
}

const KEY = 'reclaim-prefs';
const DEFAULTS: Prefs = { hideBalances: false, meId: null, scope: 'household', notifyImport: false };

function load(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; }
}

interface PrefsValue {
  prefs: Prefs;
  setPref<K extends keyof Prefs>(k: K, v: Prefs[K]): void;
  /** Temporarily show hidden balances after a tap. */
  revealed: boolean;
  reveal(): void;
}

const Ctx = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);
  const [revealed, setRevealed] = useState(false);
  const setPref = useCallback(<K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefs(p => {
      const next = { ...p, [k]: v };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
      return next;
    });
  }, []);
  const reveal = useCallback(() => {
    setRevealed(true);
    window.setTimeout(() => setRevealed(false), 30000);
  }, []);
  return <Ctx.Provider value={{ prefs, setPref, revealed, reveal }}>{children}</Ctx.Provider>;
}

export const usePrefs = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePrefs outside PrefsProvider');
  return v;
};
