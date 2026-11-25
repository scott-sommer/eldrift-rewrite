import { createQuantityReservations } from '../../persistence/quantities/store';
import type { StatePort } from '../../persistence/versioned-state';
import type { LaborTaskPayload } from '../../features/work/labor-task';
import { logisticsPool } from '../../capabilities/logistics/request';
import { taskScope } from '../../persistence/tasks/scope';
import type { IntentResult } from '../../core/execution/action-arbiter';
export type LaborEffect = 'pickup' | 'work' | 'return';
export function laborScope(payload: LaborTaskPayload): string { return taskScope(payload.proposal.input.request.name,'household-labor:'+payload.proposal.input.request.id); }
export function createLaborClaims(state: StatePort) {
  const ledger = createQuantityReservations(state);
  function release(creep: Creep, payload: LaborTaskPayload, kind: LaborEffect): void {
    if (state.read('quantity-reservations/empire') === undefined) return;
    ledger.releasePool(identity(creep,payload,kind),pool(payload,kind));
  }
  return {
    protectCargo(creep: Creep, payload: LaborTaskPayload): boolean {
      const scope = laborScope(payload), id = scope+':cargo', pool = logisticsPool('capacity',creep.id), capacity = creep.store.getCapacity(RESOURCE_ENERGY);
      if (!Number.isSafeInteger(capacity) || capacity < 1) return false;
      const existing = ledger.list(Game.time).find(claim => claim.id === id);
      if (existing) return existing.owner === payload.proposal.input.request.owner && existing.holder === creep.name && existing.scope === scope && JSON.stringify(existing.allocations) === JSON.stringify([{ pool,amount: capacity }]);
      return ledger.reserve({ id,owner: payload.proposal.input.request.owner,holder: creep.name,scope,expiresAt: payload.proposal.observedAt+payload.proposal.input.policy.horizon+1,allocations: [{ pool,amount: capacity }] },{ [pool]: creep.store.getFreeCapacity(RESOURCE_ENERGY) },Game.time);
    },
    releaseObserved(creep: Creep, payload: LaborTaskPayload): void {
      const pending = payload.progress?.pending;
      if (pending && pending.tick < Game.time) release(creep,payload,pending.kind);
    },
    issue(creep: Creep, payload: LaborTaskPayload, kind: LaborEffect, amount: number, capacity: number, invoke: () => IntentResult): IntentResult | undefined {
      const key = identity(creep,payload,kind);
      if (ledger.list(Game.time).some(claim => claim.id === key.id)) return undefined;
      const claim = { ...key,expiresAt: payload.proposal.observedAt+payload.proposal.input.policy.horizon+1,allocations: [{ pool: pool(payload,kind),amount }] };
      if (!ledger.reserve(claim,{ [pool(payload,kind)]: capacity },Game.time)) return undefined;
      const result = invoke(); if (result.status !== 'issued') release(creep,payload,kind);
      return result;
    },
  };
}
function identity(creep: Creep, payload: LaborTaskPayload, kind: LaborEffect) {
  const scope = laborScope(payload);
  return { id: scope+':'+kind,owner: payload.proposal.input.request.owner,holder: creep.name,scope };
}
function pool(payload: LaborTaskPayload, kind: LaborEffect): string {
  const input = payload.proposal.input;
  if (kind === 'pickup') return logisticsPool('stock',input.source,'energy');
  if (kind === 'return') return logisticsPool('capacity',input.source);
  return logisticsPool('work',input.order.id,input.order.kind);
}
