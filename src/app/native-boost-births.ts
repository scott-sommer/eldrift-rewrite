import type { StatePort } from '../persistence/versioned-state';
import type { createNativeDispatch } from './native-dispatch';
import { createBoostRequests } from '../features/industry/boosts/store';
import { boostScope, holdsBoostUnit } from '../capabilities/industry/boosts/model';
import { validBoostRequest } from '../features/industry/boosts/schema';
/** Adopt the spawn-carried contract before any actor feature runs; queue pressure keeps the actor gated. */
export function createNativeBoostBirths(state: StatePort,dispatch: Pick<ReturnType<typeof createNativeDispatch>,'arbiter' | 'structures'>) {
  const store = createBoostRequests(state);
  return () => {
    for (const creep of Object.values(Game.creeps)) {
      const birth = creep.memory.industryBoostBirth;
      if (!birth) continue;
      const request = { ...birth,unit: creep.id,name: creep.name };
      if (!validBoostRequest(request)) throw new Error('Invalid native birth boost contract');
      if (store.adoptBirth(request,Game.time)) { delete creep.memory.industryBoostBirth; continue; }
      if (store.read().some(job => job.request.unit === creep.id && holdsBoostUnit(job))) continue;
      const identity = creep.memory.population;
      if (!creep.spawning && identity?.owner === birth.owner && identity.home === birth.home) {
        dispatch.arbiter.claim(creep.name,boostScope(request));
        dispatch.structures.holdBody(creep,boostScope(request));
      }
    }
  };
}
