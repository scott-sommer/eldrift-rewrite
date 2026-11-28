import { validateBuildSites } from './construction-validation';
import { validateRepairTargets } from './repair';
import { tileKey } from '../../movement/traffic/model';
import { withinRange } from '../../movement/path-model';
import { energyHarvestEffect } from '../../mining/harvest-effect';
import { addGroundEnergy } from './ground';
import { validateContainerLifecycle } from './container';
import type { EnergyEcology,EnergyInventory,EnergyHarvestIntent,EnergyHarvestEffect,EnergySource } from './model';
export function validateEnergyEcology(ecology: EnergyEcology,stores: readonly EnergyInventory[]): void {
  validateEcologyBounds(ecology); validateRepairTargets(ecology.structures === undefined ? [] : ecology.structures);
  const ids = ecology.sources.map(source => source.id),tiles = ecology.ground.map(drop => tileKey(drop.position));
  if (new Set(ids).size !== ids.length || new Set(tiles).size !== tiles.length || stores.some(store => ids.includes(store.id))) throw new Error('Duplicate source/ground energy identities');
  validateContainers(ecology,stores); validateBuildSites(ecology,stores);
  for (const source of ecology.sources) validateSource(source);
  if (ecology.ground.some(drop => !quantity(drop.energy) || drop.energy === 0)) throw new Error('Invalid physical dropped energy');
}
function validateSource(source: EnergySource): void {
  tileKey(source.position);
  if (!source.id || ![source.energy,source.capacity,source.regenerationTicks].every(quantity) || source.energy > source.capacity || source.regenerationTicks < 1) throw new Error('Invalid physical source');
  if (source.regenerationIn !== null && (!quantity(source.regenerationIn) || source.regenerationIn > source.regenerationTicks)) throw new Error('Invalid source regeneration clock');
}
export function validateHarvest(intent: EnergyHarvestIntent,stores: ReadonlyMap<string,EnergyInventory>,ecology: EnergyEcology): void {
  const source = ecology.sources.find(source => source.id === intent.source); tileKey(intent.position);
  if (!intent.id || !quantity(intent.amount) || intent.amount === 0 || !stores.has(intent.target) || !source) throw new Error('Invalid physical harvest intent');
  if (!withinRange(intent.position,source.position,1) || intent.container === intent.target) throw new Error('Invalid physical harvest geometry');
  if (intent.container !== undefined) validateOverflowContainer(intent,stores,ecology);
}
function validateOverflowContainer(intent: EnergyHarvestIntent,stores: ReadonlyMap<string,EnergyInventory>,ecology: EnergyEcology): void {
  const container = ecology.containers.find(container => container.id === intent.container);
  if (!container || container.destroyedAt !== undefined || !stores.has(container.id) || !withinRange(intent.position,container.position,0)) throw new Error('Missing or misplaced physical overflow container');
}
function validateContainers(ecology: EnergyEcology,stores: readonly EnergyInventory[]): void {
  if (new Set(ecology.containers.map(container => tileKey(container.position))).size !== ecology.containers.length) throw new Error('Ambiguous physical overflow tile');
  if (new Set(ecology.containers.map(container => container.id)).size !== ecology.containers.length) throw new Error('Duplicate physical overflow containers');
  for (const container of ecology.containers) {
    tileKey(container.position);
    validateContainerLifecycle(container,ecology,stores);
  }
}
export function settleHarvest(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,intent: EnergyHarvestIntent,tick: number): EnergyHarvestEffect {
  const source = ecology.sources.find(source => source.id === intent.source)!,unit = stores.get(intent.target)!;
  const effect = energyHarvestEffect(intent.amount,source.energy,unit.energy,unit.energy+unit.freeEnergyCapacity);
  source.energy -= effect.harvestedEnergy;
  const carriedEnergy = effect.carriedEnergy-unit.energy; credit(unit,carriedEnergy);
  const beneath = ecology.containers.find(container => withinRange(container.position,intent.position,0));
  const container = beneath && stores.get(beneath.id);
  const containerEnergy = Math.min(effect.overflowEnergy,container?.freeEnergyCapacity ?? 0);
  if (container) credit(container,containerEnergy);
  const droppedEnergy = effect.overflowEnergy-containerEnergy;
  if (droppedEnergy > 0) addGroundEnergy(ecology,intent.position,droppedEnergy);
  return { ...intent,amount: effect.harvestedEnergy,issuedAt: tick,settledAt: tick+1,carriedEnergy,containerEnergy,droppedEnergy };
}
function credit(store: EnergyInventory,amount: number): void { store.energy += amount; store.usedCapacity += amount; store.freeEnergyCapacity -= amount; }
function quantity(value: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= 1000000; }

function validateEcologyBounds(ecology: EnergyEcology): void {
  if (!Number.isSafeInteger(ecology.decayDivisor) || ecology.decayDivisor < 1 || ecology.sources.length > 64 || ecology.ground.length > 256 || ecology.containers.length > 256) throw new Error('Invalid energy ecology bounds');
}
