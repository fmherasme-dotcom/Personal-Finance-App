import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Bill, Budget, Holding, IncomeSource, Member, WasteItem } from '../store/types';
import { BalanceSheet } from './BalanceSheet';
import { BillSheet } from './BillSheet';
import { GoalSheet } from './GoalSheet';
import { HoldingSheet, PricesSheet } from './HoldingSheets';
import { BudgetSheet, IncomeSheet, MemberSheet } from './HouseholdSheets';
import { ReclaimSheet } from './ReclaimSheet';
import { TransactionSheet } from './TransactionSheet';

export type SheetReq =
  | { type: 'transaction'; preset?: { category?: string; source?: string } }
  | { type: 'balance'; accountId?: string }
  | { type: 'reclaim'; item: WasteItem }
  | { type: 'bill'; bill?: Bill }
  | { type: 'holding'; holding?: Holding }
  | { type: 'prices' }
  | { type: 'member'; member?: Member }
  | { type: 'income'; income?: IncomeSource }
  | { type: 'budget'; budget?: Budget }
  | { type: 'goal' };

const Ctx = createContext<(r: SheetReq) => void>(() => {});
export const useSheet = () => useContext(Ctx);

export function SheetHost({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<SheetReq | null>(null);
  const close = useCallback(() => setReq(null), []);
  return (
    <Ctx.Provider value={setReq}>
      {children}
      {req?.type === 'transaction' && <TransactionSheet onClose={close} preset={req.preset} />}
      {req?.type === 'balance' && <BalanceSheet onClose={close} accountId={req.accountId} />}
      {req?.type === 'reclaim' && <ReclaimSheet onClose={close} item={req.item} />}
      {req?.type === 'bill' && <BillSheet onClose={close} bill={req.bill} />}
      {req?.type === 'holding' && <HoldingSheet onClose={close} holding={req.holding} />}
      {req?.type === 'prices' && <PricesSheet onClose={close} />}
      {req?.type === 'member' && <MemberSheet onClose={close} member={req.member} />}
      {req?.type === 'income' && <IncomeSheet onClose={close} income={req.income} />}
      {req?.type === 'budget' && <BudgetSheet onClose={close} budget={req.budget} />}
      {req?.type === 'goal' && <GoalSheet onClose={close} />}
    </Ctx.Provider>
  );
}
