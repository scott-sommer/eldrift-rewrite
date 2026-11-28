import { validateBuild } from './construction';
import { validateBuildAccounting } from './construction-checkpoint';
import { withinRange } from '../../movement/path-model';
import type { EnergyInventory,EnergyEffect,EnergyEcology,EnergyHarvestEffect,EnergyRepairEffect } from './model';
import { validateRepair } from './repair';
import { validateHarvest } from './ecology';
import { validateEnergyTransfer } from './validation';
/** A closed frame retains only effects observable on its next tick, including zero effects. */
export function validateEnergyEffects(nextTick: number,effects: readonly EnergyEffect[],stores: readonly EnergyInventory[],ecology: EnergyEcology): void {
  if (!Array.isArray(effects) || effects.length > 512 || new Set(effects.map(effect => effect.id)).size !== effects.length) throw new Error('Invalid energy effect checkpoint');
  const byId = recordedStores(stores,ecology,nextTick);
  const endpoints = new Set([...byId.keys(),...ecology.containers.filter(container => container.destroyedAt === nextTick).map(container => container.id)]);
  for (const effect of effects) {
    validateEffectKind(effect,byId,ecology,endpoints,nextTick);
    if (!Number.isSafeInteger(effect.amount) || effect.amount < 0 || effect.issuedAt !== nextTick-1 || effect.settledAt !== nextTick) throw new Error('Invalid energy effect clock/quantity');
  }
}

function recordedStores(stores: readonly EnergyInventory[],ecology: EnergyEcology,tick: number) {
  const byId = new Map(stores.map(store => [store.id,store]));
  // Identity witnesses only: these zero-stock records never enter live inventories.
  for (const body of ecology.bodies ?? []) if (body.diedAt === tick) byId.set(body.id,{ id: body.id,energy: 0,capacity: 0,usedCapacity: 0,freeEnergyCapacity: 0 });
  return byId;
}
function validateHarvestAccounting(effect: EnergyHarvestEffect): void {
  if (![effect.carriedEnergy,effect.containerEnergy,effect.droppedEnergy].every(value => Number.isSafeInteger(value) && value >= 0)
    || effect.carriedEnergy+effect.containerEnergy+effect.droppedEnergy !== effect.amount) throw new Error('Invalid harvest effect accounting');
}

function validateRepairAccounting(effect: EnergyRepairEffect): void {
  if (!Number.isSafeInteger(effect.repairedHits) || effect.repairedHits < 0 || effect.repairedHits > 1000000000 || effect.amount > effect.profile.workParts) throw new Error('Invalid repair effect accounting');
  if ((effect.amount === 0) !== (effect.repairedHits === 0)) throw new Error('Inconsistent repair effect energy/hits');
}

function validateEffectKind(effect: EnergyEffect,stores: ReadonlyMap<string,EnergyInventory>,ecology: EnergyEcology,endpoints: ReadonlySet<string>,tick: number): void {
  if (effect.kind === 'harvest') {
    validateRecordedHarvest(effect,stores,ecology,tick); validateHarvestAccounting(effect);
  } else if (effect.kind === 'repair') { validateRepair(effect,stores,ecology,tick); validateRepairAccounting(effect); }
  else if (effect.kind === 'build') { validateBuild(effect,stores,ecology,tick); validateBuildAccounting(effect,ecology,tick); }
  else validateEnergyTransfer({ ...effect,amount: Math.max(1,effect.amount) },endpoints,ecology.tombstones,tick);
}

function validateRecordedHarvest(effect: EnergyHarvestEffect,stores: ReadonlyMap<string,EnergyInventory>,ecology: EnergyEcology,tick: number): void {
  const container = ecology.containers.find(container => container.id === effect.container);
  if (container?.destroyedAt === tick) {
    if (!withinRange(container.position,effect.position,0)) throw new Error('Invalid destroyed harvest container position');
    const intent = { ...effect }; delete intent.container;
    validateHarvest({ ...intent,amount: Math.max(1,effect.amount) },stores,ecology);
  } else validateHarvest({ ...effect,amount: Math.max(1,effect.amount) },stores,ecology);
}
