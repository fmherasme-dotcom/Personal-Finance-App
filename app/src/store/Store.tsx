import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { addDays, addMonths, fromISO, toISO, todayISO } from '../lib/dates';
import { uid } from '../lib/format';
import type { Backend } from './backend';
import { connect } from './backend';
import { accountValue, netWorth } from './derive';
import type { Account, Bill, CollectionName, Config, Data, Destination, Holding, History, Transaction, WasteItem } from './types';
import { COLLECTIONS, DEFAULT_CONFIG, EMPTY_HISTORY } from './types';

const EMPTY: Data = {
  config: null, history: EMPTY_HISTORY, members: [], income: [], accounts: [], holdings: [], transactions: [],
  budgets: [], bills: [], waste: [], rules: [], reviews: [],
};

type Status = 'connecting' | 'ready' | 'error';

interface StoreValue {
  data: Data;
  status: Status;
  backendKind: Backend['kind'] | null;
  error: string | null;
  toast: string | null;
  notify(msg: string): void;
  save<T extends { id: string }>(col: CollectionName | 'meta', doc: T): Promise<void>;
  remove(col: CollectionName, id: string): Promise<void>;
  saveConfig(patch: Partial<Config>): Promise<void>;
  updateAccount(id: string, value: number, note?: string): Promise<void>;
  saveHoldings(holdings: Holding[]): Promise<void>;
  removeHolding(id: string): Promise<void>;
  reclaim(item: WasteItem, dest: Destination): Promise<void>;
  setWasteStatus(item: WasteItem, status: 'snoozed' | 'kept'): Promise<void>;
  undoWaste(item: WasteItem): Promise<void>;
  flagBill(bill: Bill): Promise<void>;
  unflagBill(bill: Bill): Promise<void>;
  markBillPaid(bill: Bill): Promise<void>;
  addTransaction(tx: Omit<Transaction, 'id'>): Promise<void>;
  markReviewed(weekId: string, reviewed: boolean): Promise<void>;
  resetAll(): Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
};

const advance = (due: string, freq: Bill['freq']) => {
  const d = fromISO(due);
  return toISO(freq === 'Weekly' ? addDays(d, 7) : freq === 'Quarterly' ? addMonths(d, 3) : freq === 'Yearly' ? addMonths(d, 12) : addMonths(d, 1));
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [data, setData] = useState<Data>(EMPTY);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const toastTimer = useRef<number>();

  useEffect(() => {
    let alive = true;
    connect().then(b => alive && setBackend(b));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!backend) return;
    const mark = (k: string) => setLoaded(prev => (prev.has(k) ? prev : new Set(prev).add(k)));
    const onError = (msg: string) => setError(msg);
    const unsubs = COLLECTIONS.map(col =>
      backend.subscribe(col, docs => {
        setData(d => ({ ...d, [col]: docs }));
        mark(col);
      }, onError),
    );
    unsubs.push(
      backend.subscribe('meta', docs => {
        const config = docs.find(d => d.id === 'config') as unknown as Config | undefined;
        const history = docs.find(d => d.id === 'history') as unknown as History | undefined;
        setData(d => ({
          ...d,
          config: config ? { ...DEFAULT_CONFIG, ...config } : null,
          history: history ? { ...EMPTY_HISTORY, ...history } : EMPTY_HISTORY,
        }));
        mark('meta');
      }, onError),
    );
    return () => unsubs.forEach(u => u());
  }, [backend]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const guard = useCallback(async (p: Promise<void>) => {
    try {
      await p;
    } catch (e) {
      const code = (e as { code?: string }).code;
      notify(code === 'invalid_argument' ? "Couldn't save. You may have view-only access." : code === 'quota_exceeded' ? 'Storage is full. Delete old entries to add more.' : "Couldn't save. Try again.");
      throw e;
    }
  }, [notify]);

  const api = useMemo<Omit<StoreValue, 'data' | 'status' | 'backendKind' | 'error' | 'toast' | 'notify'>>(() => {
    const b = () => {
      if (!backend) throw new Error('not connected');
      return backend;
    };
    const save = <T extends { id: string }>(col: string, doc: T) => guard(b().set(col, doc.id, doc as unknown as Record<string, unknown>));
    const remove = (col: string, id: string) => guard(b().remove(col, id));

    /** Append today's net worth to the trend, replacing any earlier entry from today. */
    const recordNetWorth = async (next: Data) => {
      const value = netWorth(next).value;
      const t = todayISO();
      const snaps = next.history.netWorth.filter(s => s.date !== t).concat({ date: t, value }).sort((a, z) => a.date.localeCompare(z.date)).slice(-400);
      await save('meta', { id: 'history', ...next.history, netWorth: snaps });
    };

    return {
      save,
      remove,
      async saveConfig(patch) {
        await save('meta', { id: 'config', ...DEFAULT_CONFIG, ...(dataRef.current.config ?? {}), ...patch });
      },
      async updateAccount(id, value, note) {
        const d = dataRef.current;
        const acct = d.accounts.find(a => a.id === id);
        if (!acct) return;
        const next: Account = { ...acct, value, updatedAt: todayISO(), ...(note !== undefined ? { note } : {}) };
        await save('accounts', next);
        await recordNetWorth({ ...d, accounts: d.accounts.map(a => (a.id === id ? next : a)) });
      },
      async saveHoldings(hs) {
        const d = dataRef.current;
        for (const h of hs) await save('holdings', h);
        const merged = [...d.holdings.filter(h => !hs.some(x => x.id === h.id)), ...hs];
        await recordNetWorth({ ...d, holdings: merged });
      },
      async removeHolding(id) {
        const d = dataRef.current;
        await remove('holdings', id);
        await recordNetWorth({ ...d, holdings: d.holdings.filter(h => h.id !== id) });
      },
      async reclaim(item, dest) {
        const { derived: _d, ...rest } = item;
        void _d;
        const bill = item.billId ? dataRef.current.bills.find(x => x.id === item.billId) : undefined;
        await save('waste', { ...rest, status: 'reclaimed', destination: dest, resolvedAt: todayISO(), snoozeUntil: undefined, ...(bill ? { billSnapshot: bill } : {}) });
        if (bill) await remove('bills', bill.id);
      },
      async setWasteStatus(item, status) {
        const { derived: _d, ...rest } = item;
        void _d;
        await save('waste', { ...rest, status, resolvedAt: todayISO(), snoozeUntil: status === 'snoozed' ? toISO(addDays(new Date(), 30)) : undefined });
      },
      async undoWaste(item) {
        if (item.id.startsWith('budget-')) {
          await remove('waste', item.id);
          return;
        }
        const { billSnapshot, ...rest } = item;
        await save('waste', { ...rest, status: 'open', destination: undefined, resolvedAt: undefined, snoozeUntil: undefined });
        if (billSnapshot) await save('bills', billSnapshot);
      },
      async flagBill(bill) {
        await save('waste', {
          id: 'bill-' + bill.id,
          group: bill.kind === 'subscription' ? 'Subscriptions' : 'Fees & Interest',
          name: bill.name,
          why: bill.lastUsed ? `Last used ${Math.round((Date.now() - fromISO(bill.lastUsed).getTime()) / 86400000)} days ago` : `Flagged from Bills · ${bill.freq.toLowerCase()}`,
          source: 'Personal',
          monthly: Math.round(bill.freq === 'Weekly' ? (bill.amount * 52) / 12 : bill.freq === 'Yearly' ? bill.amount / 12 : bill.freq === 'Quarterly' ? bill.amount / 3 : bill.amount),
          status: 'open',
          billId: bill.id,
        });
      },
      async unflagBill(bill) {
        await remove('waste', 'bill-' + bill.id);
      },
      async markBillPaid(bill) {
        await save('bills', { ...bill, lastPaid: todayISO(), due: advance(bill.due, bill.freq) });
        if (bill.category) {
          await save('transactions', {
            id: uid(), date: todayISO(), type: 'expense', amount: bill.amount, category: bill.category,
            account: 'Household checking', personId: bill.payerId, source: 'Personal', vendor: bill.name, note: 'Bill payment',
          } satisfies Transaction);
        }
      },
      async addTransaction(tx) {
        await save('transactions', { ...tx, id: uid() });
      },
      async markReviewed(weekId, reviewed) {
        if (reviewed) await save('reviews', { id: weekId, reviewedAt: new Date().toISOString() });
        else await remove('reviews', weekId);
      },
      async resetAll() {
        const d = dataRef.current;
        for (const col of COLLECTIONS) for (const doc of d[col]) await b().remove(col, doc.id);
        await b().remove('meta', 'history');
        await b().remove('meta', 'config');
      },
    };
  }, [backend, guard]);

  const status: Status = !backend ? 'connecting' : loaded.size >= COLLECTIONS.length + 1 ? 'ready' : error ? 'error' : 'connecting';

  const value: StoreValue = { ...api, data, status, backendKind: backend?.kind ?? null, error, toast, notify };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { accountValue };
