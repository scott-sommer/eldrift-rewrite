import { sameSpawnRequest } from '../../../capabilities/spawning/placement';
import { peekState } from '../../../persistence/versioned-state';
import type { StatePort } from '../../../persistence/versioned-state';
import { spawnQueueSchema } from '../../population/spawn-schema';
import type { StartupPlanningQuery } from './planning/model';
/** Reject unpriced current queue spending; prior observed births are independently verified. */
export function startupQueueMatches(state: StatePort, home: string, query: StartupPlanningQuery): boolean {
  if (query.input.project.spawning.room !== home || query.tick < query.observedAt) return false;
  const horizon = query.observedAt+query.input.project.spawning.cash.horizon;
  const requests = query.input.project.spawning.requests;
  const pending = peekState(state,'spawning/'+home,spawnQueueSchema(home))?.requests ?? [];
  return pending.every(request => {
    if (request.expiresAt <= query.tick || request.readyAt > horizon) return true;
    const proposed = requests.find(proposed => proposed.id === request.id);
    return !!proposed && sameSpawnRequest(proposed,{ ...request,readyAt: Math.max(0,request.readyAt-query.observedAt),expiresAt: request.expiresAt-query.observedAt });
  });
}
