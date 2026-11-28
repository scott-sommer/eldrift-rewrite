export type EconomyAction = 'move' | 'dismantle' | 'harvest' | 'build' | 'repair' | 'upgradeController' | 'transfer' | 'withdraw' | 'pickup' | 'drop';
/** Engine4.3.2 suppresses harvest/build/repair/dismantle against each other. */
export function economySlots(action: EconomyAction): readonly string[] {
  if (action === 'harvest' || action === 'build' || action === 'repair' || action === 'dismantle') return ['primary-work'];
  return [action];
}
