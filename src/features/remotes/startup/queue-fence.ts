import type { SpawnRequest } from '../../../capabilities/spawning/request';
import { sameSpawnRequest } from '../../../capabilities/spawning/placement';
import { peekState } from '../../../persistence/versioned-state';
import type { StatePort } from '../../../persistence/versioned-state';
import { spawnQueueSchema } from '../../population/spawn-schema';
import type { StartupPlanningQuery } from './planning/model';
/** Reject unpriced current queue spending; prior observed births are independently verified. */
export function startupQueueMatches(state: StatePort, home: string, query: StartupPlanningQuery, attempt?: Readonly<SpawnRequest>): boolean {
  if (query.input.project.spawning.room !== home || query.tick < query.observedAt) return false;
  const horizon = query.observedAt+query.input.project.spawning.cash.horizon;
  const requests = query.input.project.spawning.requests;
  const pending = peekState(state,'spawning/'+home,spawnQueueSchema(home))?.requests ?? [];
  return pending.every(request => {
    if (request.expiresAt <= query.tick || request.readyAt > horizon) return true;
    const current = attemptedRequest(request,attempt,query.tick);
    const proposed = requests.find(proposed => proposed.id === current.id);
    return !!proposed && sameSpawnRequest(proposed,{ ...current,readyAt: Math.max(0,current.readyAt-query.observedAt),expiresAt: current.expiresAt-query.observedAt });
  });
}

/** The coordinator seals an exact attempt before preparation; this is not a general queue-change exemption. */
function attemptedRequest(current: SpawnRequest, attempt: Readonly<SpawnRequest> | undefined, tick: number): Readonly<SpawnRequest> {
  if (!attempt || current.readyAt !== tick+1 || attempt.readyAt > tick) return current;
  return sameSpawnRequest({ ...current,readyAt: attempt.readyAt },attempt) ? attempt : current;
}
