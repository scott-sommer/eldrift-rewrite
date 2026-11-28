import { tileKey } from '../../movement/traffic/model';
import { withinRange } from '../../movement/path-model';
import { copyPlain } from '../../../core/plain-data';
import { energyBuildEffect,validateBuildProfile } from '../../construction/build-effect';
import type { EnergyEcology,EnergyInventory,EnergyBuildSite,EnergyBuildIntent,EnergyBuildEffect,EnergyBornInventory } from './model';
export { validateBuildSites } from './construction-validation';
export function validateBuild(intent: EnergyBuildIntent,stores: ReadonlyMap<string,EnergyInventory>,ecology: EnergyEcology,recordedAt?: number): void {
  tileKey(intent.position); validateBuildProfile(intent.profile);
  const site = ecology.sites?.find(site => site.id === intent.target);
  if (!intent.id || !stores.has(intent.source) || !site || !withinRange(intent.position,site.position,3) || typeof intent.allowed !== 'boolean') throw new Error('Invalid physical build intent/range');
  if (site.completedAt !== undefined && site.completedAt !== recordedAt) throw new Error('Completed physical construction site');
  if (!site.completion) throw new Error('Construction completion recipe requires qualification');
}
export function settleBuild(stores: Map<string,EnergyInventory | EnergyBornInventory>,ecology: EnergyEcology,intent: EnergyBuildIntent,tick: number): EnergyBuildEffect {
  const unit = stores.get(intent.source)!,site = ecology.sites!.find(site => site.id === intent.target)!;
  const effect = intent.allowed && site.completedAt === undefined ? energyBuildEffect(intent.profile,site.progress,site.progressTotal,unit.energy) : { energySpent: 0,progressAdded: 0 };
  site.progress += effect.progressAdded;
  unit.energy -= effect.energySpent; unit.usedCapacity -= effect.energySpent; unit.freeEnergyCapacity += effect.energySpent;
  const completed = effect.progressAdded > 0 && site.progress === site.progressTotal;
  if (completed) completeSite(stores,ecology,site,tick);
  return { ...intent,amount: effect.energySpent,progressAdded: effect.progressAdded,completed,...(completed ? { created: site.completion!.store.id } : {}),issuedAt: tick,settledAt: tick+1 };
}
function completeSite(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,site: EnergyBuildSite,tick: number): void {
  const birth = copyPlain(site.completion!);
  if (stores.has(birth.store.id) || ecology.containers.some(container => container.id === birth.store.id) || ecology.structures?.some(target => target.id === birth.store.id)) throw new Error('Construction birth identity collision');
  stores.set(birth.store.id,birth.store);
  ecology.containers.push(birth.container); (ecology.structures ??= []).push(birth.health);
  site.completedAt = tick+1;
}
export function validateBuildClocks(ecology: EnergyEcology,nextTick: number): void {
  if (ecology.sites?.some(site => site.completedAt !== undefined && site.completedAt > nextTick)) throw new Error('Future construction completion clock');
}
