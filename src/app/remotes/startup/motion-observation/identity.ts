import { remoteFleetIdentity } from '../../../../features/remotes/fleet/identity';
import type { PaidCourierContext } from './model';
export function paidCourierMatches(context: PaidCourierContext,creep: Creep,tick: number): boolean {
  const { paid,cohort,plan } = context;
  if (!creep.my || creep.name !== paid.request || creep.memory.population?.home !== cohort.home) return false;
  if (!actorMatches(context,creep) || !bodyMatches(context,creep)) return false;
  if (plan.home !== cohort.home || plan.room !== cohort.room || plan.source !== cohort.source || plan.endpoint.id !== cohort.endpoint) return false;
  return lifetimeMatches(context,creep,tick);
}
function actorMatches(context: PaidCourierContext,creep: Creep): boolean {
  const actor = remoteFleetIdentity(creep.memory.population?.owner ?? ''),scope = context.cohort;
  return !!actor && actor.kind === 'courier' && actor.home === scope.home && actor.room === scope.room && actor.source === scope.source && creep.memory.population?.owner === context.paid.owner;
}
function bodyMatches(context: PaidCourierContext,creep: Creep): boolean {
  return JSON.stringify(creep.body.map(part => part.type)) === JSON.stringify(context.paid.body)
    && creep.body.every(part => part.hits === 100 && part.boost === undefined && ['carry','move'].includes(part.type));
}
function lifetimeMatches(context: PaidCourierContext,creep: Creep,tick: number): boolean {
  const paid = context.paid;
  if (paid.startAt > tick || paid.retireAt <= tick || creep.store.getUsedCapacity() !== creep.store.energy) return false;
  return creep.spawning ? tick < paid.activeAt && creep.store.energy === 0 : tick >= paid.activeAt && tick+Number(creep.ticksToLive) === paid.expiresAt;
}
