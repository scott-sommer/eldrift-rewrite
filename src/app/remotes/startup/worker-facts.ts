import { remotePopulationIdentity } from '../reachability/identity';
import { movementPosition } from '../../../adapters/screeps/movement-traffic';
import type { StartupWorkerFacts } from './facts-model';
/** Include the whole room cohort: reservers/builders and other-source liabilities are not free. */
export function observeStartupWorkers(home: string, room: string, guard: () => boolean): StartupWorkerFacts[] | undefined {
  const workers: StartupWorkerFacts[] = [];
  for (const creep of Object.values(Game.creeps)) {
    if (!guard()) return undefined;
    if (!creep.my) continue;
    const owner = creep.memory.population?.owner ?? '', identity = remotePopulationIdentity(owner);
    if (identity?.home !== home || identity.room !== room) continue;
    if (workers.length === 128) return undefined;
    workers.push({ name: creep.name,owner,position: movementPosition(creep.pos),spawning: creep.spawning,ticksToLive: creep.ticksToLive ?? null,energy: creep.store.energy,
      body: creep.body.map(part => ({ type: part.type,hits: part.hits,boost: part.boost === undefined ? null : String(part.boost) })) });
  }
  return workers.sort((a,b) => a.name.localeCompare(b.name));
}
