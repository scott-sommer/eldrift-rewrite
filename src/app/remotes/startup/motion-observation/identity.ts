import { remoteFleetIdentity } from '../../../../features/remotes/fleet/identity';
import type { PaidCourierContext } from './model';
export function paidCourierMatches(context: PaidCourierContext,creep: Creep,tick: number): boolean {
  return paidRemoteUnitMatches(context,creep,tick,'courier');
}
export function paidRemoteUnitMatches(context: PaidCourierContext,creep: Creep,tick: number,kind: 'miner' | 'courier'): boolean {
  const { paid,cohort,plan } = context;
  if (!creep.my || creep.name !== paid.request || creep.memory.population?.home !== cohort.home) return false;
  if (!actorMatches(context,creep,kind) || !bodyMatches(context,creep,kind)) return false;
  if (plan.home !== cohort.home || plan.room !== cohort.room || plan.source !== cohort.source || plan.endpoint.id !== cohort.endpoint) return false;
  return lifetimeMatches(context,creep,tick);
}
function actorMatches(context: PaidCourierContext,creep: Creep,kind: 'miner' | 'courier'): boolean {
  const actor = remoteFleetIdentity(creep.memory.population?.owner ?? ''),scope = context.cohort;
  return !!actor && actor.kind === kind && actor.home === scope.home && actor.room === scope.room && actor.source === scope.source && creep.memory.population?.owner === context.paid.owner;
}
function bodyMatches(context: PaidCourierContext,creep: Creep,kind: 'miner' | 'courier'): boolean {
  const permitted = kind === 'miner' ? ['work','carry','move'] : ['carry','move'];
  return JSON.stringify(creep.body.map(part => part.type)) === JSON.stringify(context.paid.body)
    && creep.body.every(part => part.hits === 100 && part.boost === undefined && permitted.includes(part.type));
}
function lifetimeMatches(context: PaidCourierContext,creep: Creep,tick: number): boolean {
  const paid = context.paid;
  if (paid.startAt > tick || paid.retireAt <= tick || creep.store.getUsedCapacity() !== creep.store.energy) return false;
  return creep.spawning ? tick < paid.activeAt && creep.store.energy === 0 : tick >= paid.activeAt && tick+Number(creep.ticksToLive) === paid.expiresAt;
}
