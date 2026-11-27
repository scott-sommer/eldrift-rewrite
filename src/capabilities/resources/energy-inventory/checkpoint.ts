import type { EnergyInventory,EnergyTransferEffect } from './model';
import { validateEnergyTransfer } from './validation';
/** A closed frame retains only effects observable on its next tick, including zero effects. */
export function validateEnergyEffects(nextTick: number,effects: readonly EnergyTransferEffect[],stores: readonly EnergyInventory[]): void {
  if (!Array.isArray(effects) || effects.length > 512 || new Set(effects.map(effect => effect.id)).size !== effects.length) throw new Error('Invalid energy effect checkpoint');
  const byId = new Map(stores.map(store => [store.id,store]));
  for (const effect of effects) {
    validateEnergyTransfer({ ...effect,amount: Math.max(1,effect.amount) },byId);
    if (!Number.isSafeInteger(effect.amount) || effect.amount < 0 || effect.issuedAt !== nextTick-1 || effect.settledAt !== nextTick) throw new Error('Invalid energy effect clock/quantity');
  }
}
