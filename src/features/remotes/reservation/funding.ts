export interface ReservationBirth { owner: string; cost: number; needed: boolean }
/** Existing service does not consume another birth budget; new/replacement births share a finite bank. */
export function allocateReservationBirths(plans: readonly ReservationBirth[], storageEnergy: number, reserve: number, otherPendingEnergy: number): Set<string> {
  if (![storageEnergy,reserve,otherPendingEnergy].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid reservation funding');
  let available = Math.max(0,storageEnergy-reserve-otherPendingEnergy);
  const selected = new Set<string>(), seen = new Set<string>();
  for (const plan of plans) {
    if (!plan.owner || !Number.isSafeInteger(plan.cost) || plan.cost <= 0 || seen.has(plan.owner)) throw new Error('Invalid reservation birth');
    seen.add(plan.owner);
    if (plan.needed && plan.cost > available) continue;
    selected.add(plan.owner); if (plan.needed) available -= plan.cost;
  }
  return selected;
}
