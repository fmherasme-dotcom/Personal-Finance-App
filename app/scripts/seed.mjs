// Builds the example household as {collection: {docId: body}} relative to today.
// Usage: node scripts/seed.mjs > seed.json
const now = new Date();
const T = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = n => iso(new Date(T.getFullYear(), T.getMonth(), T.getDate() + n));
const mStart = new Date(T.getFullYear(), T.getMonth(), 1);
const inMonth = d => iso(new Date(mStart.getFullYear(), mStart.getMonth(), Math.min(d, T.getDate())));
const mk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const out = {};
const put = (col, id, body) => ((out[col] ??= {})[id] = body);

const M = { michael: 'm-michael', dana: 'm-dana', lucas: 'm-lucas', sofia: 'm-sofia' };
put('members', M.michael, { name: 'Michael Reyes', relation: 'You · Head of household', role: 'Owner', order: 0 });
put('members', M.dana, { name: 'Dana Reyes', relation: 'Spouse', role: 'Member', order: 1 });
put('members', M.lucas, { name: 'Lucas Reyes', relation: 'Adult son', role: 'Member', order: 2 });
put('members', M.sofia, { name: 'Sofia Reyes', relation: 'Adult daughter', role: 'View-only', order: 3 });

put('income', 'inc-a', { label: 'Restoration · Owner draw', source: 'Business A', amount: 3500, freq: 'week' });
put('income', 'inc-b', { label: 'Cigar Brand · Distribution', source: 'Business B', amount: 1200, freq: 'week' });
put('income', 'inc-dana', { label: 'Dana · Consulting', source: 'Personal', amount: 1500, freq: 'week' });

const A = [['cash', 'Cash', '3 accounts', 86000], ['investments', 'Investments', 'Brokerage ··8812', 0, 'portfolio'], ['retirement', 'Retirement accounts', '401(k), 2 IRAs', 418000], ['realestate', 'Real estate', 'Primary home', 740000], ['vehicles', 'Vehicles', '2 vehicles', 92000], ['business', 'Business equity', 'Restoration $260K · Cigar $100K', 360000]];
A.forEach(([id, name, note, value, linked], i) => put('accounts', id, { name, note, kind: 'asset', value, order: i, updatedAt: day(-7), ...(linked ? { linked } : {}) }));
const L = [['mortgage', 'Mortgage', '5.1% · 22 yrs left', 612000], ['bizloans', 'Business loans', 'Equipment line, SBA', 118000], ['auto', 'Auto loan', '3.9%', 24000], ['cards', 'Credit cards', '1 card carrying a balance', 14000]];
L.forEach(([id, name, note, value], i) => put('accounts', id, { name, note, kind: 'liability', value, order: i, updatedAt: day(-7) }));

// value, week change %
const H = [['VTI', 'Total US Market ETF', 412, 121990, 0.6, 'etf', 0.03], ['VXUS', 'Intl. Stock ETF', 590, 38420, -0.2, 'etf', 0.07], ['MSFT', 'Microsoft', 68, 31240, 0.4, 'stock'], ['MGRWX', 'Meridian Growth Fund', 1140, 29200, -0.3, 'fund', 0.92], ['AAPL', 'Apple', 104, 24860, 1.1, 'stock'], ['BRK.B', 'Berkshire Hathaway B', 46, 22690, 0.2, 'stock'], ['BTC', 'Bitcoin', 0.31, 31480, 2.8, 'crypto'], ['ETH', 'Ethereum', 3.2, 9640, -1.4, 'crypto'], ['SOL', 'Solana', 14.5, 2480, 4.2, 'crypto']];
H.forEach(([tk, name, qty, value, chg, kind, fee]) => {
  const price = Math.round((value / qty) * 100) / 100;
  put('holdings', 'h-' + tk.toLowerCase().replace('.', ''), { tk, name, qty, unit: kind === 'crypto' ? tk : 'sh', price, prevPrice: Math.round((price / (1 + chg / 100)) * 100) / 100, kind, ...(fee != null ? { fee } : {}), pricedAt: day(-1) });
});

const B = [['Housing', 4300], ['Travel', 2500], ['Groceries', 1400], ['Dining out', 600], ['Shopping', 800], ['Utilities', 700], ['Auto & fuel', 450], ['Health & fitness', 250], ['Gifts', 300], ['Entertainment', 120]];
B.forEach(([category, amount]) => put('budgets', category.toLowerCase().replace(/[^a-z0-9]+/g, '-'), { category, amount }));

// This month's personal spending: [day of month, category, amount, person, vendor]
const X = [
  [1, 'Housing', 4210, 'michael', 'Mortgage'], [27, 'Travel', 1240, 'michael', 'Delta Air Lines'], [28, 'Travel', 720, 'dana', 'Marriott'],
  [4, 'Groceries', 212, 'dana', 'Harris Teeter'], [9, 'Groceries', 188, 'dana', 'Whole Foods'], [14, 'Groceries', 231, 'lucas', 'Harris Teeter'], [20, 'Groceries', 176, 'dana', 'Costco'], [25, 'Groceries', 149, 'sofia', 'Trader Joe\'s'], [28, 'Groceries', 184, 'dana', 'Harris Teeter'],
  [5, 'Dining out', 96, 'michael', 'Haberdish'], [10, 'Dining out', 184, 'michael', 'Anniversary dinner'], [13, 'Dining out', 62, 'lucas', 'Chipotle'], [17, 'Dining out', 148, 'dana', 'Kindred'], [22, 'Dining out', 118, 'michael', 'Supperland'], [26, 'Dining out', 74, 'sofia', 'Sweetgreen'], [28, 'Dining out', 130, 'michael', 'Fin & Fino'],
  [26, 'Shopping', 312, 'dana', 'Nordstrom'], [15, 'Shopping', 228, 'lucas', 'REI'], [27, 'Shopping', 150, 'sofia', 'Target'],
  [8, 'Utilities', 312, 'michael', 'Duke Energy'], [20, 'Utilities', 189, 'michael', 'Spectrum'], [22, 'Utilities', 109, 'dana', 'Charlotte Water'],
  [6, 'Auto & fuel', 98, 'michael', 'Shell'], [12, 'Auto & fuel', 104, 'lucas', 'QT'], [19, 'Auto & fuel', 112, 'michael', 'Bosch service'], [27, 'Auto & fuel', 106, 'dana', 'Shell'],
  [2, 'Health & fitness', 89, 'michael', 'Summit Athletic'], [16, 'Health & fitness', 147, 'dana', 'CVS'],
  [29, 'Gifts', 180, 'dana', 'Etsy'],
  [5, 'Entertainment', 63, 'lucas', 'Reelhouse'], [11, 'Entertainment', 37, 'sofia', 'Northlight TV'], [24, 'Entertainment', 48, 'michael', 'Spotify'],
];
X.forEach(([d, category, amount, who, vendor], i) => put('transactions', `x-${i}`, { date: inMonth(d), type: 'expense', amount, category, account: 'Platinum card ··1009', personId: M[who], source: 'Personal', vendor }));
// Owner draws every Friday this month, plus Dana's consulting.
for (let d = 1; d <= T.getDate(); d++) {
  const dt = new Date(T.getFullYear(), T.getMonth(), d);
  if (dt.getDay() === 5) {
    put('transactions', `da-${d}`, { date: iso(dt), type: 'income', amount: 3500, category: 'Owner draw', account: 'Household checking', personId: M.michael, source: 'Business A' });
    put('transactions', `db-${d}`, { date: iso(dt), type: 'income', amount: 1200, category: 'Owner draw', account: 'Household checking', personId: M.michael, source: 'Business B' });
  }
  if (dt.getDay() === 3) put('transactions', `dc-${d}`, { date: iso(dt), type: 'income', amount: 1500, category: 'Consulting', account: 'Household checking', personId: M.dana, source: 'Personal' });
}

const bill = (id, name, amount, freq, due, payer, kind, extra = {}) => put('bills', id, { name, amount, freq, due, payerId: M[payer], kind, ...extra });
bill('elec', 'Electric', 312, 'Monthly', day(-3), 'michael', 'bill', { category: 'Utilities' });
bill('auto-ins', 'Auto insurance', 186, 'Monthly', day(0), 'dana', 'bill', { category: 'Auto & fuel' });
bill('plat', 'Platinum card', 3940, 'Statement', day(1), 'michael', 'bill');
bill('mort', 'Mortgage', 4210, 'Monthly', day(2), 'michael', 'bill', { category: 'Housing' });
bill('reel', 'Reelhouse', 15.99, 'Monthly', day(3), 'dana', 'subscription', { lastUsed: day(-41), category: 'Entertainment' });
bill('gym', 'Summit Athletic Club', 89, 'Monthly', day(4), 'michael', 'subscription', { lastUsed: day(-74), category: 'Health & fitness' });
bill('north', 'Northlight TV', 17.99, 'Monthly', day(6), 'sofia', 'subscription', { lastUsed: day(-2), lastPaid: day(-5), category: 'Entertainment' });
bill('net', 'Internet', 189, 'Monthly', day(21), 'michael', 'bill', { lastPaid: day(-10), category: 'Utilities' });
bill('water', 'Water & sewer', 96, 'Monthly', day(23), 'dana', 'bill', { lastPaid: day(-8), category: 'Utilities' });

const W = [
  ['gym', 'Subscriptions', 'Summit Athletic Club', 'No check-ins in 74 days', 'Personal', 89, 'gym'],
  ['stream', 'Duplicate Services', 'Three streaming services', 'Reelhouse, Northlight TV and Vista+ overlap', 'Personal', 47],
  ['cloud', 'Duplicate Services', 'Second cloud storage plan', 'CloudVault and DriveBox, both 2 TB', 'Personal', 20],
  ['late', 'Fees & Interest', 'Credit card late fee', 'Platinum card, paid 3 days late', 'Personal', 39],
  ['int', 'Fees & Interest', 'Carried card interest', '$4,600 balance at 23.9% APR', 'Personal', 90],
  ['merch', 'Fees & Interest', 'Merchant processing above rate', '3.4% vs. 2.6% market rate', 'Business B', 95],
  ['vendor', 'Business Waste', 'Second equipment rental vendor', 'Same equipment as your primary vendor', 'Business A', 180],
  ['seat', 'Business Waste', 'Unused project software seat', 'Fieldline Pro, no login in 60 days', 'Business A', 65],
  ['ads', 'Business Waste', 'Paid social ads', '$400 spent, about $140 margin returned', 'Business B', 400],
  ['crm', 'Business Waste', 'Unused CRM seats', '3 of 5 seats inactive', 'Business B', 79],
];
W.forEach(([id, group, name, why, source, monthly, billId]) => put('waste', id, { group, name, why, source, monthly, status: 'open', ...(billId ? { billId } : {}) }));

put('rules', 'r1', { match: 'Tobacconist Supply', category: 'Inventory', source: 'Business B' });
put('rules', 'r2', { match: 'Summit Athletic', category: 'Health & fitness', source: 'Personal' });
put('rules', 'r3', { match: 'Rental', category: 'Equipment', source: 'Business A' });
put('rules', 'r4', { match: 'County Treasurer', category: 'Housing', source: 'Personal' });

// Net worth month-ends ($K) for the previous 11 months, then last week and today.
const NW = [1148, 1156, 1149, 1171, 1180, 1176, 1192, 1205, 1199, 1218, 1231];
const snaps = NW.map((v, i) => ({ date: iso(new Date(T.getFullYear(), T.getMonth() - 11 + i + 1, 0)), value: v * 1000 }));
const ws = new Date(T.getFullYear(), T.getMonth(), T.getDate() - ((T.getDay() + 6) % 7) - 1);
snaps.push({ date: iso(ws), value: 1236150 });
snaps.push({ date: iso(T), value: 1240000 });
const DA = [14.2, 13.8, 12.6, 13.1, 14.0, 14.9, 15.4, 15.8, 16.1, 15.0, 14.6], DB = [4.1, 4.6, 5.8, 4.2, 3.9, 4.4, 4.8, 5.0, 5.3, 4.9, 5.6];
const drawsA = {}, drawsB = {};
DA.forEach((v, i) => { const k = mk(new Date(T.getFullYear(), T.getMonth() - 11 + i, 1)); drawsA[k] = v * 1000; drawsB[k] = DB[i] * 1000; });
put('meta', 'history', { netWorth: snaps.sort((a, b) => a.date.localeCompare(b.date)), drawsA, drawsB });
put('meta', 'config', {
  onboarded: true, example: true, household: 'Reyes household',
  goal: { year: T.getFullYear() + 5, month: 4, monthlyIncome: 18000, number: 2000000 },
  monthlyContribution: 3000, returnRate: 0.07, reviewDay: 'Sunday', reminderTime: '19:00', remind: true,
  reclaimedBase: { Savings: 5200, Investments: 2100, 'Retirement goal': 1120 }, reclaimedBaseYear: T.getFullYear(),
  savingsAccount: 'High-yield savings ··2290 · 4.3% APY', investAccount: 'Brokerage ··8812',
});

process.stdout.write(JSON.stringify(out));
