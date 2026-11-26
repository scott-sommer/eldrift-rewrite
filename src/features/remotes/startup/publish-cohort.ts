import type { SpawnRequest } from '../../../capabilities/spawning/request';
import { validPlanningContext } from './planning/validation';
import { sameSpawnRequest, copySpawnRequest } from '../../../capabilities/spawning/placement';
import { validateRequest } from '../../../capabilities/spawning/allocate';
import type { StatePort } from '../../../persistence/versioned-state';
import { peekState } from '../../../persistence/versioned-state';
import { spawnQueueSchema } from '../../population/spawn-schema';
import { createSpawnQueue } from '../../population/spawn-queue';
import { reserveExpectedSpawnIdentity } from '../../population/spawn-identity';
import { remoteFleetIdentity } from '../fleet/identity';
import type { StartupPlanningQuery } from './planning/model';
/** Publish future guarded participants through the existing queue and identity owners. Approval is separate and must follow successful publication. */
export function publishStartupCohort(state: StatePort, home: string, query: StartupPlanningQuery, occupied: ReadonlySet<string>) {
  const requests = materializeParticipants(home,query);
  if (query.tick > query.expiresAt) return 'deadline' as const;
  const pending = peekState(state,'spawning/'+home,spawnQueueSchema(home))?.requests ?? [];
  const refusal = publicationRefusal(requests,pending,query.tick,occupied); if (refusal) return refusal;
  const queue = createSpawnQueue(state,home);
  for (const request of requests) {
    if (pending.some(item => item.id === request.id)) continue;
    if (!reserveExpectedSpawnIdentity(state,home,request.id)) return 'identity' as const;
    queue.submit(request);
  }
  return 'published' as const;
}
function validParticipant(request: SpawnRequest, home: string, query: StartupPlanningQuery): boolean {
  validateRequest(request);
  const identity = remoteFleetIdentity(request.owner), marker = request.admission;
  return identity?.home === home && identity.room === query.room && identity.source === query.source && request.room === home
    && marker?.kind === 'remote-startup' && marker.generation === query.generation && marker.observedAt === query.observedAt;
}

function publicationRefusal(requests: readonly SpawnRequest[], pending: readonly SpawnRequest[], tick: number, occupied: ReadonlySet<string>) {
  if (requests.some(request => request.readyAt <= tick || occupied.has(request.name))) return 'deadline' as const;
  if (pending.length+requests.filter(request => !pending.some(item => item.id === request.id)).length > 200) return 'capacity' as const;
  if (requests.some(request => pending.some(item => item.id === request.id && !sameSpawnRequest(item,request)))) return 'conflict' as const;
  return undefined;
}

function materializeParticipants(home: string, query: StartupPlanningQuery): SpawnRequest[] {
  if (!validPlanningContext(query,home,query.tick) || query.input.project.spawning.room !== home) throw new Error('Invalid startup publication context');
  const participants = new Set([...query.input.project.workers,...query.input.couriers].map(worker => worker.request));
  const requests = query.input.project.spawning.requests.filter(request => participants.has(request.id)).map(request => copySpawnRequest({ ...request,readyAt: request.readyAt+query.observedAt,expiresAt: request.expiresAt+query.observedAt }));
  if (!requests.length || requests.some(request => !validParticipant(request,home,query))) throw new Error('Invalid future startup cohort');
  return requests;
}
