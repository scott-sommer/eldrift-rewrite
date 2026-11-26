import { spawnedActiveTicks } from '../../capabilities/spawning/lifetime';
import { sameSpawnPlacement } from '../../capabilities/spawning/placement';
import type { SpawnRequest } from '../../capabilities/spawning/request';
/** Current paid body/clocks only; no historical proof is synthesized for a missing or changed actor. */
export function observeStartupBirths(requests: readonly SpawnRequest[]) {
  return requests.flatMap(request => {
    const creep = Game.creeps[request.name], population = creep?.memory.population;
    if (!creep?.my || !population || creep.body.some(part => part.hits !== 100 || part.boost)) return [];
    if (!sameSpawnPlacement(request.placement,creep.memory.birthPlacement)) return [];
    const body = creep.body.map(part => part.type), activeAt = activation(creep);
    if (activeAt === undefined) return [];
    return [{ request: request.id,owner: population.owner,home: population.home,body,startAt: activeAt-body.length*CREEP_SPAWN_TIME,activeAt }];
  });
}
function activation(creep: Creep): number | undefined {
  if (!creep.spawning) return Number.isSafeInteger(creep.ticksToLive) && creep.ticksToLive! > 0 ? Game.time+creep.ticksToLive!-spawnedActiveTicks(creep.body.map(part => part.type)) : undefined;
  const spawn = Object.values(Game.spawns).find(spawn => spawn.spawning?.name === creep.name), clock = spawn?.spawning;
  if (!clock || clock.needTime !== creep.body.length*CREEP_SPAWN_TIME || clock.remainingTime < 1 || clock.remainingTime > clock.needTime) return undefined;
  return Game.time+clock.remainingTime;
}
