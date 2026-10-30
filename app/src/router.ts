import { useCallback, useEffect, useState } from 'react';

export const ROUTES = ['home', 'waste', 'networth', 'portfolio', 'bills', 'coach', 'business', 'retirement', 'budget', 'prefs', 'rules', 'import'] as const;
export type Route = (typeof ROUTES)[number];

// Plain #name hashes only — claude.ai passes these through to the page.
const read = (): Route => {
  const r = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'home';
};

export function useRoute() {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((r: Route) => {
    if (read() === r) window.scrollTo(0, 0);
    else window.location.hash = r;
  }, []);
  return { route, go };
}

/** Which bottom tab a screen belongs to. */
export const TAB_FOR: Record<Route, 'home' | 'waste' | 'networth' | 'bills' | 'coach'> = {
  home: 'home', business: 'home', retirement: 'home', budget: 'home', prefs: 'home', rules: 'home', import: 'home',
  waste: 'waste', networth: 'networth', portfolio: 'networth', bills: 'bills', coach: 'coach',
};
