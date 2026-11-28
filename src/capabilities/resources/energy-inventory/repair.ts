import { tileKey } from '../../movement/traffic/model';
import { withinRange } from '../../movement/path-model';
import { boostedEnergyRepairEffect,validateRepairProfile } from '../../mining/repair-effect';
import type { EnergyEcology,EnergyInventory,EnergyRepairIntent,EnergyRepairEffect,EnergyRepairTarget } from './model';
export function validateRepairTargets(targets: readonly EnergyRepairTarget[]): void {
  if (!Array.isArray(targets) || targets.length > 512 || new Set(targets.map(target => target.id)).size !== targets.length) throw new Error('Invalid repair target identities');
  for (const target of targets) {
    tileKey(target.position);
    if (!target.id || typeof target.repairable !== 'boolean' || ![target.hits,target.hitsMax].every(quantity) || target.hitsMax < 1 || target.hits > target.hitsMax) throw new Error('Invalid repair target health');
  }
}
export function validateRepair(intent: EnergyRepairIntent,stores: ReadonlyMap<string,EnergyInventory>,ecology: EnergyEcology,recordedAt?: number): void {
  tileKey(intent.position); validateRepairProfile(intent.profile);
  const target = ecology.structures?.find(target => target.id === intent.target);
  const destroyed = ecology.containers.find(container => container.id === intent.target)?.destroyedAt;
  if (destroyed !== undefined && destroyed !== recordedAt) throw new Error('Destroyed physical repair target');
  if (!intent.id || !stores.has(intent.source) || !target || !withinRange(intent.position,target.position,3)) throw new Error('Invalid physical repair intent/range');
}
export function settleRepair(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,intent: EnergyRepairIntent,tick: number): EnergyRepairEffect {
  const unit = stores.get(intent.source)!,target = ecology.structures!.find(target => target.id === intent.target)!;
  const effect = target.repairable ? boostedEnergyRepairEffect(intent.profile,target.hits,target.hitsMax,unit.energy) : { repairedHits: 0,energySpent: 0 };
  target.hits += effect.repairedHits;
  unit.energy -= effect.energySpent; unit.usedCapacity -= effect.energySpent; unit.freeEnergyCapacity += effect.energySpent;
  return { ...intent,amount: effect.energySpent,repairedHits: effect.repairedHits,issuedAt: tick,settledAt: tick+1 };
}
function quantity(value: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= 1000000000; }
