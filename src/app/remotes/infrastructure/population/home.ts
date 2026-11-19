import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import { observePopulation } from '../../../../adapters/screeps/population';
import { createSpawnQueue } from '../../../../features/population/spawn-queue';
import { remoteConstructionBody } from '../../../../features/remotes/infrastructure/worker-budget';
import { remoteConstructionIdentity } from '../../../../features/remotes/infrastructure/worker-identity';
import type { ConstructionHomeSnapshot } from './model';
export function constructionHome(state: StatePort, name: string, config: Readonly<RuntimeConfig>): ConstructionHomeSnapshot | undefined {
  const home = Game.rooms[name];
  if (!home?.controller?.my || home.controller.level < config.remoteMinimumRcl) return undefined;
  const body = remoteConstructionBody(Math.min(home.energyCapacityAvailable,config.remoteConstructionBodyBudget));
  return body ? { home,body,pending: createSpawnQueue(state,name).list(),roster: observePopulation().filter(unit => unit.room === name) } : undefined;
}
export function constructionBudget(snapshot: ConstructionHomeSnapshot, config: Readonly<RuntimeConfig>) {
  const liveWorkers = snapshot.roster.filter(unit => remoteConstructionIdentity(unit.owner)).length;
  const remoteUnits = snapshot.roster.filter(unit => remoteOwner(unit.owner)).length;
  const sourcePending = snapshot.pending.filter(request => request.owner.startsWith('remote-fleet:') && !Game.creeps[request.name]).length;
  return { storageEnergy: snapshot.home.storage?.store.energy ?? 0,storageReserve: config.remoteConstructionEnergyReserve,
    spawnEnergy: snapshot.home.energyAvailable,maximumWorkers: config.remoteConstructionMaximumWorkers,liveWorkers,
    additionalSlots: Math.max(0,config.remoteWorkerMaximumUnits-remoteUnits-sourcePending) };
}
export function remoteOwner(owner: string): boolean { return owner.startsWith('remote-fleet:') || !!remoteConstructionIdentity(owner); }
