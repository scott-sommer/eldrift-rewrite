import type { StartupCashFlow } from './cash-model';
import { startupFlowCount } from './flow';
export function startupExpenseTotals(flows: readonly StartupCashFlow[]) {
  let outside = 0, unlocated = 0;
  for (const flow of flows) {
    if (flow.kind === 'delivery') continue;
    if (flow.spending === 'outside-spawn') outside += flow.energy;
    else unlocated += flow.energy;
  }
  return { outside,unlocated };
}
export function startupOutsideExpenseThrough(flows: readonly StartupCashFlow[], through: number): number {
  return flows.filter(flow => flow.spending === 'outside-spawn').reduce((sum,flow) => sum+flow.energy*startupFlowCount(flow,0,through),0);
}
export function startupHasLocatedExpenses(flows: readonly StartupCashFlow[]): boolean {
  return flows.some(flow => flow.spending !== undefined);
}
