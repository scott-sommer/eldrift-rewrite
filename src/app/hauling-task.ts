import type { StatePort } from '../persistence/versioned-state';
import type { LogisticsRequest } from '../capabilities/logistics/request';
import { validateLogisticsRequest } from '../capabilities/logistics/request';
import type { TaskBehavior } from './task-runner';
import { taskScope } from './task-runner';
import { runHauling } from './hauling-cycle';
import type { HaulingBinding, HaulingPorts, HaulingView } from './hauling-cycle';
export interface HaulingTaskPayload { home: string; unitId: string; sinkRoom?: string; request: LogisticsRequest }
export interface HaulingTaskPorts<Context> {
  identity(context: Context): { id: string; name: string };
  view(context: Context, payload: HaulingTaskPayload): HaulingView;
  execution(context: Context, binding: HaulingBinding): HaulingPorts;
}
export function validHaulingPayload(value: unknown): value is HaulingTaskPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as HaulingTaskPayload;
  if (![payload.home, payload.unitId].every(item => typeof item === 'string' && item.length > 0)) return false;
  if (payload.sinkRoom !== undefined && (typeof payload.sinkRoom !== 'string' || !payload.sinkRoom)) return false;
  try { validateLogisticsRequest(payload.request); return true; } catch { return false; }
}
/** Continuous hauling waits retain the task; expiry and explicit terminal failures remain bounded by the runner. */
export function createHaulingTaskBehavior<Context>(state: StatePort, ports: HaulingTaskPorts<Context>): TaskBehavior<Context> {
  return {
    phases: ['work'], validPayload: validHaulingPayload,
    handlers: task => ({ work: context => {
      const payload = task.payload as HaulingTaskPayload;
      const unit = ports.identity(context);
      if (unit.id !== payload.unitId) return { status: 'failed', reason: 'hauling-unit-replaced' };
      const binding = { home: payload.home, unit: unit.id, holder: unit.name, scope: taskScope(unit.name, task.id), request: payload.request };
      const result = runHauling(state, binding, ports.view(context, payload), ports.execution(context, binding));
      return result.status === 'blocked' ? { status: 'running' } : result;
    } }),
  };
}
