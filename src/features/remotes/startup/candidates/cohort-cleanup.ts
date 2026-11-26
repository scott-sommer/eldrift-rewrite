import { sameSpawnRequest } from '../../../../capabilities/spawning/placement';
import { peekState } from '../../../../persistence/versioned-state';
import type { StatePort } from '../../../../persistence/versioned-state';
import { spawnQueueSchema } from '../../../population/spawn-schema';
import { createSpawnQueue } from '../../../population/spawn-queue';
import { remoteFleetIdentity } from '../../fleet/identity';
import type { StartupPlanningQuery } from '../planning/model';
/** Remove exact unstarted participant requests only. Occupied names and changed queue records are preserved. */
export function cleanupStartupCohort(state: StatePort, home: string, query: StartupPlanningQuery, occupiedNames: ReadonlySet<string>) {
  const result = { cancelled: [] as string[],occupied: [] as string[],conflicts: [] as string[] };
  if (query.input.project.spawning.room !== home) throw new Error('Startup cleanup home mismatch');
  const queued = peekState(state,'spawning/'+home,spawnQueueSchema(home))?.requests ?? [], queue = createSpawnQueue(state,home);
  for (const proposed of participantRequests(home,query)) {
    if (occupiedNames.has(proposed.name)) { result.occupied.push(proposed.id); continue; }
    const current = queued.find(request => request.id === proposed.id); if (!current) continue;
    const expected = { ...proposed,readyAt: proposed.readyAt+query.observedAt,expiresAt: proposed.expiresAt+query.observedAt };
    if (!sameSpawnRequest(current,expected)) { result.conflicts.push(proposed.id); continue; }
    if (queue.cancel(current.id,current.owner)) result.cancelled.push(current.id);
  }
  return result;
}

function participantRequests(home: string, query: StartupPlanningQuery) {
  const participants = new Set([...query.input.project.workers,...query.input.couriers].map(worker => worker.request));
  return query.input.project.spawning.requests.filter(request => {
    const identity = remoteFleetIdentity(request.owner);
    return participants.has(request.id) && identity?.home === home && identity.room === query.room && identity.source === query.source;
  });
}
