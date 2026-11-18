import { openState, peekState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { copyPlain } from '../../persistence/plain-data';
import { remoteAssignmentSchema } from './assignment-schema';
import { remoteAssignmentDemands } from './assignment-demand';
import { natural, remoteAssignmentId, room, validRemotePlan } from './assignment-validation';
import type { RemoteAssignment, RemoteAssignmentBatch, RemoteAssignmentResult, RemoteRoomPlan, RemoteAssignmentDemand } from './assignment-model';
const key = 'remotes/assignments';
/** One empire index owns room exclusivity; all changes are synchronous and committed as a single envelope. */
export function createRemoteAssignmentStore(port: StatePort) {
  const read = () => peekState(port,key,remoteAssignmentSchema) ?? remoteAssignmentSchema.initial();
  function reconcile(input: RemoteAssignmentBatch): RemoteAssignmentResult {
    validateBatch(input);
    const batch = copyPlain(input), state = read();
    if (batch.tick < state.clock || batch.expectedRevision !== state.revision) return { status: 'stale',revision: state.revision };
    const active = state.assignments.filter(item => item.expiresAt > batch.tick);
    const conflict = active.find(item => item.home !== batch.home && batch.plans.some(plan => plan.room === item.plan.room));
    if (conflict) return { status: 'conflict',room: conflict.plan.room,home: conflict.home };
    const others = active.filter(item => item.home !== batch.home || batch.scope && !batch.scope.includes(item.plan.room));
    if (others.length + batch.plans.length > 128) return { status: 'capacity' };
    const revision = state.revision + 1;
    if (!Number.isSafeInteger(revision)) throw new Error('Remote assignment revision overflow');
    const assignments = batch.plans.map(plan => lease(batch,normalizePlan(plan),active,revision));
    const next = { revision,clock: batch.tick,assignments: [...others,...assignments].sort((a,b) => a.plan.room.localeCompare(b.plan.room)) };
    if (!remoteAssignmentSchema.valid(next)) throw new Error('Invalid remote assignment transition');
    openState(port,key,remoteAssignmentSchema); saveState(port,key,remoteAssignmentSchema,next);
    return { status: 'applied',revision,assignments: copyPlain(assignments) };
  }
  return { read,reconcile,
    resolve(token: Pick<RemoteAssignmentDemand, 'id' | 'assignment' | 'generation' | 'expiresAt'>, tick: number): RemoteAssignmentDemand | undefined {
      const state = read();
      if (!natural(tick) || tick < state.clock || !natural(token.expiresAt) || tick >= token.expiresAt) return undefined;
      const current = state.assignments.find(item => item.id === token.assignment && item.generation === token.generation);
      if (!current || token.expiresAt > current.expiresAt) return undefined;
      return remoteAssignmentDemands(current,tick).find(item => item.id === token.id);
    },
    owner(target: string, tick: number): RemoteAssignment | undefined {
      if (!room(target) || !natural(tick)) throw new Error('Invalid remote owner query');
      const state = read();
      if (tick < state.clock) return undefined;
      return state.assignments.find(item => item.plan.room === target && item.expiresAt > tick);
    },
    permits(home: string, target: string, generation: number, tick: number): boolean {
      const state = read();
      if (!natural(tick) || tick < state.clock) return false;
      return state.assignments.some(item => item.home === home && item.plan.room === target
        && item.generation === generation && item.expiresAt > tick);
    },
  };
}
function lease(batch: RemoteAssignmentBatch, plan: RemoteRoomPlan, active: RemoteAssignment[], revision: number): RemoteAssignment {
  const previous = active.find(item => item.home === batch.home && item.plan.room === plan.room);
  const unchanged = previous && JSON.stringify(previous.plan) === JSON.stringify(plan);
  return { id: remoteAssignmentId(batch.home,plan.room),home: batch.home,plan,
    generation: unchanged ? previous.generation : revision,renewedAt: batch.tick,expiresAt: batch.tick + batch.lifetime };
}
function normalizePlan(plan: RemoteRoomPlan): RemoteRoomPlan {
  const reserve = plan.reserve;
  return { room: plan.room,sources: [...plan.sources].sort(),
    reserve: reserve ? { id: reserve.id,position: { room: reserve.position.room,x: reserve.position.x,y: reserve.position.y } } : null,
    infrastructure: plan.infrastructure ? { roads: plan.infrastructure.roads,containers: plan.infrastructure.containers } : null };
}
function validateBatch(batch: RemoteAssignmentBatch): void {
  if (!room(batch.home) || !natural(batch.expectedRevision) || !natural(batch.tick)) throw new Error('Invalid remote assignment batch');
  validateLifetime(batch.tick,batch.lifetime);
  validateScope(batch);
  if (!Array.isArray(batch.plans) || batch.plans.length > 64 || !batch.plans.every(validRemotePlan)) throw new Error('Invalid remote assignment plans');
  if (batch.plans.some(plan => plan.room === batch.home) || new Set(batch.plans.map(plan => plan.room)).size !== batch.plans.length) throw new Error('Conflicting remote assignment plans');
}

function validateLifetime(tick: number, lifetime: number): void {
  if (!natural(lifetime) || lifetime < 1 || !Number.isSafeInteger(tick + lifetime)) throw new Error('Invalid remote assignment lifetime');
}

function validateScope(batch: RemoteAssignmentBatch): void {
  if (batch.scope === undefined) return;
  if (!Array.isArray(batch.scope) || batch.scope.length > 128 || !batch.scope.every(room) || new Set(batch.scope).size !== batch.scope.length) throw new Error('Invalid remote assignment scope');
  if (!Array.isArray(batch.plans) || batch.plans.some(plan => !batch.scope!.includes(plan.room))) throw new Error('Remote plan outside assignment scope');
}
