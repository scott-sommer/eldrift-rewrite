import { validHaulingPayload } from '../../../hauling-task';
import { stateKey } from '../../../../persistence/state-key';
import { peekState } from '../../../../persistence/versioned-state';
import type { StatePort } from '../../../../persistence/versioned-state';
import { logisticsQueueSchema,delivered } from '../../../../features/logistics/request-schema';
import { transportToken } from '../../../../features/remotes/transport-authority';
import { createRemoteAssignmentStore } from '../../../../features/remotes/assignment-store';
import { sameLogisticsService } from '../../../../capabilities/logistics/service';
import type { LogisticsRequest } from '../../../../capabilities/logistics/request';
import type { TaskRecord } from '../../../../persistence/tasks/schema';
import type { HaulingTaskPayload } from '../../../hauling-task';
import type { PaidCourierContext,PaidCourierObservation } from './model';
export function observePaidCourierTask(state: StatePort,context: PaidCourierContext,creep: Creep,task: TaskRecord): PaidCourierObservation['task'] | undefined {
  if (!validHead(state,context,creep,task)) return undefined;
  return paidCourierTaskProgress(state,context.cohort.home,creep.id,task);
}
/** Read the same owner progress in a private forecast; native admission remains with validHead. */
export function paidCourierTaskProgress(state: StatePort, home: string, unit: string, task: TaskRecord): PaidCourierObservation['task'] | undefined {
  if (!validHaulingPayload(task.payload) || task.payload.home !== home || task.payload.unitId !== unit) return undefined;
  const request = task.payload.request;
  const record = peekState(state,stateKey('logistics-requests',home),logisticsQueueSchema)?.records.find(record => record.request.id === request.id && record.request.owner === request.owner);
  if (!record || record.cancelled || !sameRequest(record.request,request)) return undefined;
  return { record: task,id: task.id,wakeAt: task.wakeAt,expiresAt: task.expiresAt,request,remaining: request.quantity-delivered(record),receipts: record.receipts };
}
function authorized(state: StatePort,context: PaidCourierContext,request: LogisticsRequest): boolean {
  const token = transportToken(request),scope = context.cohort;
  if (!token || token.actor !== context.paid.owner || token.home !== scope.home || token.generation !== scope.generation) return false;
  const demand = createRemoteAssignmentStore(state).resolve(token,Game.time);
  return demand?.kind === 'mine' && demand.home === scope.home && demand.room === scope.room && demand.source === scope.source;
}
function serviceMatches(context: PaidCourierContext,request: LogisticsRequest): boolean {
  const plan = context.plan;
  return request.resource === 'energy' && request.sink === plan.endpoint.id && sameLogisticsService(request.service,{ collection: plan.collection,deposit: plan.endpoint.deposit,avoid: [plan.station] });
}
function sameRequest(a: LogisticsRequest,b: LogisticsRequest): boolean {
  const fields = ['id','owner','source','sink','resource','quantity','priority','expiresAt'] as const;
  return fields.every(key => a[key] === b[key]) && sameLogisticsService(a.service,b.service);
}

function validHead(state: StatePort,context: PaidCourierContext,creep: Creep,task: TaskRecord): boolean {
  const payload = task.payload as HaulingTaskPayload,request = payload.request;
  if (task.id !== request.id || payload.unitId !== creep.id || payload.home !== context.cohort.home) return false;
  if (task.expiresAt <= Game.time || request.expiresAt <= Game.time || !authorized(state,context,request)) return false;
  if (!serviceMatches(context,request)) return false;
  return true;
}
