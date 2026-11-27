import { nativeUsedCapacity } from '../../../adapters/screeps/store-usage';
import { remotePopulationIdentity } from '../reachability/identity';
import { movementPosition } from '../../../adapters/screeps/movement-traffic';
import type { StartupWorkerFacts } from './facts-model';
/** Include the whole room cohort: reservers/builders and other-source liabilities are not free. */
export function observeStartupWorkers(home: string, room: string | undefined, guard: () => boolean): StartupWorkerFacts[] | undefined {
  const workers: StartupWorkerFacts[] = [];
  for (const creep of Object.values(Game.creeps)) {
    if (!guard()) return undefined;
    if (!creep.my) continue;
    const owner = creep.memory.population?.owner ?? '', identity = remotePopulationIdentity(owner);
    if (identity?.home !== home || room !== undefined && identity.room !== room) continue;
    if (workers.length === 128) return undefined;
    workers.push(observeStartupWorker(creep));
  }
  return workers.sort((a,b) => a.name.localeCompare(b.name));
}

/** Detached native unit facts, including actors whose ownership is not yet qualified. */
export function observeStartupWorker(creep: Creep): StartupWorkerFacts {
  return { name: creep.name,owner: creep.memory.population?.owner ?? '',position: movementPosition(creep.pos),spawning: creep.spawning,ticksToLive: creep.ticksToLive ?? null,energy: creep.store.energy,fatigue: creep.fatigue ?? 0,usedCapacity: nativeUsedCapacity(creep.store),
      body: creep.body.map(part => ({ type: part.type,hits: part.hits,boost: part.boost === undefined ? null : String(part.boost) })) };
}
