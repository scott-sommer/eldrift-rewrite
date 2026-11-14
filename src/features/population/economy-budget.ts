export interface EconomyBudgetView {
  available: number;
  capacity: number;
  stored: number;
  miners: number;
  couriers: number;
  fillers: number;
}
export interface EconomyBudgetPolicy {
  recoveryReserve: number;
  matureCourierBudget: number;
  maximumBudget: number;
}
export const defaultEconomyBudgetPolicy: Readonly<EconomyBudgetPolicy> = {
  recoveryReserve: 5000, matureCourierBudget: 1100, maximumBudget: 10000,
};
/** Room policy chooses available energy for recovery; recipes never inspect room globals. */
export function economyBudget(role: 'miner' | 'courier' | 'scavenger', view: EconomyBudgetView,
  policy: Readonly<EconomyBudgetPolicy> = defaultEconomyBudgetPolicy): number {
  validate(view, policy);
  const capacity = Math.min(view.capacity, policy.maximumBudget);
  const available = Math.min(view.available, capacity);
  if (role === 'scavenger') return available;
  const population = role === 'miner' ? view.miners : view.couriers;
  if (population > 0) return capacity;
  const replenishable = view.stored > policy.recoveryReserve && view.fillers > 0;
  if (!replenishable) return available;
  if (role === 'miner') return capacity;
  return Math.min(capacity, Math.max(available, policy.matureCourierBudget));
}
function validate(view: EconomyBudgetView, policy: Readonly<EconomyBudgetPolicy>): void {
  if ([...Object.values(view), ...Object.values(policy)].some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Invalid economy budget input');
  if (view.available > view.capacity || policy.maximumBudget < 1) throw new Error('Invalid economy capacity');
}
