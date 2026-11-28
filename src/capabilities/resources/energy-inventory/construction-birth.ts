import { withinRange } from '../../movement/path-model';
import { validateEnergyInventories } from './validation';
import { validateRepairTargets } from './repair';
import { validateContainerLifecycle } from './container';
import type { EnergyBuildSite,EnergyContainerBirth,EnergyInventory,EnergyContainer,EnergyRepairTarget } from './model';
export function validateBirthRecipe(site: EnergyBuildSite): void {
  if (site.completion === null) {
    if (site.completedAt !== undefined) throw new Error('Unqualified construction completion');
    return;
  }
  const birth = site.completion;
  validateEnergyInventories([birth.store]); validateRepairTargets([birth.health]);
  validateContainerLifecycle(birth.container,{ sources: [],ground: [],containers: [birth.container],structures: [birth.health],decayDivisor: 1000 },[birth.store]);
  validateRecipeIdentity(site,birth); validateRecipeStock(birth); validateRecipeLocation(site,birth);
}
function validateRecipeIdentity(site: EnergyBuildSite,birth: EnergyContainerBirth): void {
  if (site.structureType !== 'container' || birth.store.id !== birth.container.id || birth.store.id !== birth.health.id || !birth.container.decay || birth.container.destroyedAt !== undefined) throw new Error('Invalid construction birth recipe');
}
function validateRecipeStock(birth: EnergyContainerBirth): void {
  if (birth.store.energy !== 0 || birth.store.usedCapacity !== 0 || birth.store.freeEnergyCapacity !== birth.store.capacity || birth.health.hits < 1 || birth.health.hits !== birth.health.hitsMax || !birth.health.repairable) throw new Error('Construction birth invents stock or damage');
}
function validateRecipeLocation(site: EnergyBuildSite,birth: EnergyContainerBirth): void {
  if (!birth.store.capacityPool || typeof birth.store.active !== 'boolean' || birth.store.room !== site.position.room || !withinRange(site.position,birth.container.position,0) || !withinRange(site.position,birth.health.position,0)) throw new Error('Invalid construction birth metadata');
}
export function validateBirthMetadata(site: EnergyBuildSite,container: EnergyContainer | undefined,health: EnergyRepairTarget | undefined,store: EnergyInventory | undefined): void {
  if (!container || !health || (!store && container.destroyedAt === undefined)) throw new Error('Missing completed construction objects');
  validateHealthMetadata(site,container,health);
  if (store) validateStoreMetadata(site.completion!.store,store);
}
function validateHealthMetadata(site: EnergyBuildSite,container: EnergyContainer,health: EnergyRepairTarget): void {
  const birth = site.completion!;
  if (!withinRange(site.position,container.position,0) || !withinRange(site.position,health.position,0) || health.hitsMax !== birth.health.hitsMax || health.repairable !== birth.health.repairable) throw new Error('Completed construction metadata mismatch');
  if (!container.decay || container.decay.amount !== birth.container.decay!.amount || container.decay.interval !== birth.container.decay!.interval) throw new Error('Completed construction decay rules mismatch');
}
function validateStoreMetadata(expected: EnergyInventory,store: EnergyInventory): void {
  const keys = ['capacity','capacityPool','room','active'] as const;
  for (const key of keys) {
    if (!(key in store) || Reflect.get(store,key) !== Reflect.get(expected,key)) throw new Error('Completed construction store metadata mismatch');
  }
}
