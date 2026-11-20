import type { StatePort } from '../persistence/versioned-state';
import type { LogisticsRequest } from '../capabilities/logistics/request';
import type { RoutePolicy } from '../capabilities/movement/room-route';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { createNativeTransfer } from '../adapters/screeps/transfer';
import { observeTransfer } from '../adapters/screeps/transfer-observation';
import { logisticsEndpoint, observeHauling } from '../adapters/screeps/hauling-observation';
import { createHaulingTaskBehavior } from './hauling-task';
import type { createNativeDispatch } from './native-dispatch';
export type NativeHaulingPolicy = RoutePolicy | ((creep: Creep, request: LogisticsRequest, phase: 'collect' | 'deliver') => RoutePolicy | undefined);
/** Native task composition shares the application's arbiter and movement flush. */
export function createNativeHaulingTask(state: StatePort,
  dispatch: Pick<ReturnType<typeof createNativeDispatch>, 'arbiter' | 'movement'>, policy: NativeHaulingPolicy,
  observe: typeof observeHauling = observeHauling) {
  return createHaulingTaskBehavior<Creep>(state, {
    identity: creep => ({ id: creep.id, name: creep.name }),
    view: (creep, payload) => observe(creep, payload.request, payload.sinkRoom),
    execution: (creep, binding) => {
      const transfer = createNativeTransfer(dispatch.arbiter, dispatch.movement, createTransferJournal(state, creep.id).begin);
      return { observe: observeTransfer, execute: (request, phase, amount, attemptId, requestKey) => {
        const target = logisticsEndpoint(phase === 'collect' ? request.source : request.sink);
        if (!target) return { status: 'blocked', reason: 'hauling-endpoint-unavailable', retryAt: Game.time + 1 };
        const admitted = typeof policy === 'function' ? policy(creep,request,phase) : policy;
        if (!admitted) return { status: 'blocked',reason: 'hauling-route-admission',retryAt: Game.time + 1 };
        const kind = phase === 'deliver' ? 'transfer' : 'resourceType' in target ? 'pickup' : 'withdraw';
        return transfer(creep, { owner: binding.scope, target: target.id,
          position: { room: target.pos.roomName, x: target.pos.x, y: target.pos.y },
          resource: request.resource as ResourceConstant, kind, maximum: amount, attemptId, requestKey, policy: admitted,
          ...haulingService(request,phase) });
      } };
    },
  });
}

function haulingService(request: LogisticsRequest, phase: 'collect' | 'deliver') {
  if (!request.service) return {};
  return { service: phase === 'collect' ? request.service.collection : request.service.deposit,...(request.service.avoid ? { avoid: request.service.avoid } : {}) };
}
