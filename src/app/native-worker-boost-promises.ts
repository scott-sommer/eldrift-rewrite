import type { StatePort } from '../persistence/versioned-state';
import type { BoostStep } from '../capabilities/industry/boosts/model';
import { terminalBoost } from '../capabilities/industry/boosts/model';
import { createBoostRequests } from '../features/industry/boosts/store';
import { createSpawnQueue } from '../features/population/spawn-queue';
function queuedPromises(state: StatePort,home: string): BoostStep[][] {
  const promises: BoostStep[][] = [];
  for (const room of Object.values(Game.rooms)) {
    if (state.read('spawning/'+room.name) === undefined) continue;
    const requests = createSpawnQueue(state,room.name).list().filter(request => (request.home ?? request.room) === home && request.expiresAt > Game.time && !Game.creeps[request.name]);
    for (const request of requests) if (request.boost) promises.push([...request.boost.steps]);
  }
  return promises;
}
export function promisedNativeBoosts(state: StatePort,home: string): BoostStep[][] {
  const jobs = createBoostRequests(state).read().filter(job => job.request.home === home && !terminalBoost(job));
  const promises = jobs.map(job => job.request.steps.map((step,index) => ({ ...step,count: Math.max(0,step.count-(job.observed[index] ?? 0)) })));
  promises.push(...queuedPromises(state,home));
  for (const creep of Object.values(Game.creeps)) {
    const birth = creep.memory.industryBoostBirth;
    if (birth?.home === home && !jobs.some(job => job.request.unit === creep.id)) promises.push([...birth.steps]);
  }
  return promises;
}
