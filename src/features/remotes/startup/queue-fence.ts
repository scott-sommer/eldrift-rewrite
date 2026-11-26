import type { StartupObservedBirth } from './candidates/birth-admission';
import type { SpawnRequest } from '../../../capabilities/spawning/request';
import { sameSpawnRequest } from '../../../capabilities/spawning/placement';
import { peekState } from '../../../persistence/versioned-state';
import type { StatePort } from '../../../persistence/versioned-state';
import { spawnQueueSchema } from '../../population/spawn-schema';
import type { StartupPlanningQuery } from './planning/model';
/** Reject unpriced current queue spending; prior observed births are independently verified. */
export function startupQueueMatches(state: StatePort, home: string, query: StartupPlanningQuery, options: { attempt?: Readonly<SpawnRequest>; births?: readonly StartupObservedBirth[] | undefined } = {}): boolean {
  if (query.input.project.spawning.room !== home || query.tick < query.observedAt) return false;
  const horizon = query.observedAt+query.input.project.spawning.cash.horizon;
  const requests = query.input.project.spawning.requests;
  const pending = peekState(state,'spawning/'+home,spawnQueueSchema(home))?.requests ?? [];
  return pending.every(request => {
    if (request.expiresAt <= query.tick || request.readyAt > horizon) return true;
    const proposed = requests.find(proposed => proposed.id === request.id);
    const attempted = attemptedRequest(request,options.attempt,query.tick);
    const current = paidRequest(attempted,proposed,query,options.births ?? []);
    return !!proposed && sameSpawnRequest(proposed,{ ...current,readyAt: Math.max(0,current.readyAt-query.observedAt),expiresAt: current.expiresAt-query.observedAt });
  });
}

/** The coordinator seals an exact attempt before preparation; this is not a general queue-change exemption. */
function attemptedRequest(current: SpawnRequest, attempt: Readonly<SpawnRequest> | undefined, tick: number): Readonly<SpawnRequest> {
  if (!attempt || current.readyAt !== tick+1 || attempt.readyAt > tick) return current;
  return sameSpawnRequest({ ...current,readyAt: attempt.readyAt },attempt) ? attempt : current;
}

/** A paid actor may precede next-tick queue reconciliation; full forecast birth matching remains independent. */
function paidRequest(current: Readonly<SpawnRequest>, proposed: SpawnRequest | undefined, query: StartupPlanningQuery, births: readonly StartupObservedBirth[]): Readonly<SpawnRequest> {
  const birth = births.find(birth => birth.request === current.id);
  if (!proposed || !birth) return current;
  if (!paidClock(current,proposed,birth,query) || !paidIdentity(current,birth)) return current;
  return { ...current,readyAt: proposed.readyAt+query.observedAt };
}
function paidClock(current: Readonly<SpawnRequest>, proposed: SpawnRequest, birth: StartupObservedBirth, query: StartupPlanningQuery): boolean {
  return birth.startAt >= query.observedAt && birth.startAt <= query.tick
    && current.readyAt === birth.startAt+1 && proposed.readyAt+query.observedAt <= birth.startAt;
}
function paidIdentity(current: Readonly<SpawnRequest>, birth: StartupObservedBirth): boolean {
  return birth.owner === current.owner && birth.home === (current.home ?? current.room) && JSON.stringify(birth.body) === JSON.stringify(current.body);
}
