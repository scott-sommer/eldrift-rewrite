import type { EnergyInventory,EnergyEffect,EnergyEcology,EnergyHarvestEffect } from './model';
import { validateHarvest } from './ecology';
import { validateEnergyTransfer } from './validation';
/** A closed frame retains only effects observable on its next tick, including zero effects. */
export function validateEnergyEffects(nextTick: number,effects: readonly EnergyEffect[],stores: readonly EnergyInventory[],ecology: EnergyEcology): void {
  if (!Array.isArray(effects) || effects.length > 512 || new Set(effects.map(effect => effect.id)).size !== effects.length) throw new Error('Invalid energy effect checkpoint');
  const byId = new Map(stores.map(store => [store.id,store]));
  for (const effect of effects) {
    if (effect.kind === 'harvest') {
      validateHarvest({ ...effect,amount: Math.max(1,effect.amount) },byId,ecology);
      validateHarvestAccounting(effect);
    } else validateEnergyTransfer({ ...effect,amount: Math.max(1,effect.amount) },byId);
    if (!Number.isSafeInteger(effect.amount) || effect.amount < 0 || effect.issuedAt !== nextTick-1 || effect.settledAt !== nextTick) throw new Error('Invalid energy effect clock/quantity');
  }
}

function validateHarvestAccounting(effect: EnergyHarvestEffect): void {
  if (![effect.carriedEnergy,effect.containerEnergy,effect.droppedEnergy].every(value => Number.isSafeInteger(value) && value >= 0)
    || effect.carriedEnergy+effect.containerEnergy+effect.droppedEnergy !== effect.amount) throw new Error('Invalid harvest effect accounting');
}
