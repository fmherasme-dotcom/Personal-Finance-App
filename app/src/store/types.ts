// Shapes of the documents Reclaim keeps in its shared store.
// Dates are local calendar dates as 'YYYY-MM-DD'.

export type Source = 'Personal' | 'Business A' | 'Business B';
export const SOURCES: Source[] = ['Personal', 'Business A', 'Business B'];

export type Role = 'Owner' | 'Member' | 'View-only';

export interface Member {
  id: string;
  name: string;
  relation: string;
  role: Role;
  order?: number;
}

export interface IncomeSource {
  id: string;
  label: string;
  source: Source;
  amount: number;
  freq: 'week' | 'month';
  personId?: string;
}

export interface Account {
  id: string;
  name: string;
  note: string;
  kind: 'asset' | 'liability';
  value: number;
  updatedAt?: string;
  /** 'portfolio' = value comes from the stocks & crypto holdings. */
  linked?: 'portfolio';
  order?: number;
}

export type HoldingKind = 'etf' | 'stock' | 'fund' | 'crypto';

export interface Holding {
  id: string;
  tk: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  prevPrice: number;
  kind: HoldingKind;
  /** Annual expense ratio in percent, for funds. */
  fee?: number;
  pricedAt?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  account: string;
  personId: string;
  source: Source;
  vendor?: string;
  note?: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
}

export type BillFreq = 'Weekly' | 'Monthly' | 'Statement' | 'Quarterly' | 'Yearly';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  freq: BillFreq;
  due: string;
  payerId: string;
  kind: 'bill' | 'subscription';
  lastUsed?: string;
  lastPaid?: string;
  /** Budget category a payment counts toward; none for card payments. */
  category?: string;
}

export type WasteGroup = 'Subscriptions' | 'Fees & Interest' | 'Over-budget Categories' | 'Duplicate Services' | 'Business Waste';
export const WASTE_GROUPS: WasteGroup[] = ['Subscriptions', 'Fees & Interest', 'Over-budget Categories', 'Duplicate Services', 'Business Waste'];

export type Destination = 'Savings' | 'Investments' | 'Retirement goal';
export const DESTINATIONS: Destination[] = ['Savings', 'Investments', 'Retirement goal'];

export interface WasteItem {
  id: string;
  group: WasteGroup;
  name: string;
  why: string;
  source: Source;
  monthly: number;
  status: 'open' | 'reclaimed' | 'snoozed' | 'kept';
  destination?: Destination;
  snoozeUntil?: string;
  resolvedAt?: string;
  billId?: string;
  /** Copy of a canceled bill, restored on undo. */
  billSnapshot?: Bill;
  /** Derived items (over-budget categories) are not stored until acted on. */
  derived?: boolean;
}

export interface Rule {
  id: string;
  match: string;
  category: string;
  source: Source;
}

export interface Review {
  id: string;
  reviewedAt: string;
}

export interface Config {
  onboarded: boolean;
  example?: boolean;
  household: string;
  goal: { year: number; month: number; monthlyIncome: number; number: number };
  monthlyContribution: number;
  returnRate: number;
  reviewDay: string;
  reminderTime: string;
  remind: boolean;
  reclaimedBase: Record<Destination, number>;
  reclaimedBaseYear: number;
  savingsAccount: string;
  investAccount: string;
}

export interface Snapshot { date: string; value: number }

export interface History {
  netWorth: Snapshot[];
  /** Monthly owner-draw totals ('YYYY-MM') from before transactions were tracked. */
  drawsA: Record<string, number>;
  drawsB: Record<string, number>;
}

export interface Data {
  config: Config | null;
  history: History;
  members: Member[];
  income: IncomeSource[];
  accounts: Account[];
  holdings: Holding[];
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  waste: WasteItem[];
  rules: Rule[];
  reviews: Review[];
}

export const COLLECTIONS = ['members', 'income', 'accounts', 'holdings', 'transactions', 'budgets', 'bills', 'waste', 'rules', 'reviews'] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export const DEFAULT_CONFIG: Config = {
  onboarded: false,
  household: 'My household',
  goal: { year: new Date().getFullYear() + 5, month: 4, monthlyIncome: 18000, number: 2_000_000 },
  monthlyContribution: 3000,
  returnRate: 0.07,
  reviewDay: 'Sunday',
  reminderTime: '19:00',
  remind: true,
  reclaimedBase: { Savings: 0, Investments: 0, 'Retirement goal': 0 },
  reclaimedBaseYear: new Date().getFullYear(),
  savingsAccount: 'High-yield savings',
  investAccount: 'Brokerage',
};

export const EMPTY_HISTORY: History = { netWorth: [], drawsA: {}, drawsB: {} };
