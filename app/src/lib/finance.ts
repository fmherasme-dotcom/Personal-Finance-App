/** Future value of `monthly` invested each month for `months` at `annualRate`. */
export const fvSeries = (monthly: number, months: number, annualRate = 0.07) => {
  const r = annualRate / 12;
  return r === 0 ? monthly * months : monthly * ((Math.pow(1 + r, months) - 1) / r);
};

/** Five-year value of a monthly amount invested at 7% (≈ ×71.59). */
export const fiveYear = (monthly: number, annualRate = 0.07) => fvSeries(monthly, 60, annualRate);

/** Months until `start` growing at `annualRate` plus `monthly` contributions reaches `goal`. */
export function monthsToGoal(start: number, monthly: number, goal: number, annualRate = 0.07) {
  if (start >= goal) return 0;
  const r = annualRate / 12;
  let v = start;
  for (let n = 1; n <= 600; n++) {
    v = v * (1 + r) + monthly;
    if (v >= goal) return n;
  }
  return Infinity;
}

/** Normalize a recurring amount to per-month. */
export const perMonth = (amount: number, freq: string) =>
  freq === 'Weekly' || freq === 'week' ? (amount * 52) / 12 : freq === 'Quarterly' ? amount / 3 : freq === 'Yearly' ? amount / 12 : amount;
