import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'reclaim-theme';

function read(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* storage unavailable */ }
}

/** Current theme plus a toggle; persists to localStorage and syncs across tabs. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const t: Theme = e.newValue === 'light' ? 'light' : 'dark';
      document.documentElement.dataset.theme = t;
      setTheme(t);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      apply(next);
      return next;
    });
  }, []);

  const set = useCallback((t: Theme) => {
    apply(t);
    setTheme(t);
  }, []);

  return { theme, toggle, set };
}
