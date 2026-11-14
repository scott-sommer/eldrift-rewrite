import type { CollectionSource } from '../../capabilities/resources/collection';
import type { Position } from '../../capabilities/movement/step';
import { defaultWorkerEnergyPolicy, selectWorkerEnergy } from './energy-selection';
import type { EnergyRanker } from './energy-selection';
export type WorkerEnergyProfile = 'balanced' | 'builder' | 'fortifier' | 'upgrader' | 'upgrader-v2';
export interface EnergyProfileOptions { profile: WorkerEnergyProfile; capacity: number; storageReserve: number; holdStoragePosition: boolean }
/** Source-specific strategy is injected into common filtering/reservation-safe quantity selection. */
export function selectProfileEnergy(sources: readonly CollectionSource[], position: Position, free: number, options: EnergyProfileOptions) {
  const policy = { ...defaultWorkerEnergyPolicy, storageReserve: options.storageReserve };
  const rankers: Record<Exclude<WorkerEnergyProfile, 'balanced'>, EnergyRanker> = {
    builder: (source, distance) => ranked(builderPriority(source, distance, options.capacity), distance),
    upgrader: (source, distance) => ranked(upgraderPriority(source, distance), distance),
    fortifier: (source, distance) => ranked(fortifierPriority(source, sources.some(item => item.kind === 'storage')),
      source.kind === 'drop' ? -source.stock : distance),
    'upgrader-v2': (source, distance) => ranked(upgraderV2Priority(source, distance, options), distance),
  };
  return selectWorkerEnergy(sources, position, free, policy, options.profile === 'balanced' ? undefined : rankers[options.profile]);
}
function ranked(priority: number, score: number) { return { priority, score }; }
function builderPriority(source: CollectionSource, distance: number, capacity: number): number {
  if (source.kind === 'drop' && distance <= 3 && source.stock > 50) return 0;
  if (source.kind === 'link' && source.controllerLink && source.available >= Math.max(401, capacity) && distance < 5) return 1;
  return source.kind === 'storage' ? 2 : Infinity;
}
function upgraderPriority(source: CollectionSource, distance: number): number {
  if (source.kind === 'drop') return distance <= 3 && source.stock > 20 ? 0 : 3;
  if (source.kind === 'link' && source.controllerLink) return 1;
  return source.kind === 'storage' ? 2 : Infinity;
}
function fortifierPriority(source: CollectionSource, hasStorage: boolean): number {
  if (source.kind === 'terminal') return hasStorage && source.stock > 35000 ? 0 : 2;
  return { storage: 1, container: 3, drop: 4, link: Infinity, remains: Infinity }[source.kind];
}
function upgraderV2Priority(source: CollectionSource, distance: number, options: EnergyProfileOptions): number {
  if (source.kind === 'link' && source.controllerLink && source.available >= options.capacity) return 0;
  if ((source.kind === 'container' || source.kind === 'storage') && distance <= 3) return 1;
  return source.kind === 'storage' && !options.holdStoragePosition ? 2 : Infinity;
}
