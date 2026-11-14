import type { WorkOrder } from '../capabilities/work/assessment';
import type { Outcome } from '../core/execution/model';
import type { TaskBehavior } from './task-runner';
import { taskScope } from './task-runner';
export interface WorkTaskPayload { home: string; unitId: string; order: WorkOrder }
export function validWorkPayload(value: unknown): value is WorkTaskPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as WorkTaskPayload;
  return [payload.home, payload.unitId].every(item => typeof item === 'string' && item.length > 0) && validOrder(payload.order, payload.home);
}
function validOrder(order: WorkOrder | undefined, home: string): boolean {
  if (!order || typeof order.id !== 'string' || !order.id || !['build', 'repair', 'upgrade'].includes(order.kind)) return false;
  if (!order.position || order.position.room !== home) return false;
  if (![order.position.x, order.position.y].every(value => Number.isInteger(value) && value >= 0 && value < 50)) return false;
  if (![order.priority, order.score].every(Number.isFinite)) return false;
  return validRepairLimit(order);
}
function validRepairLimit(order: WorkOrder): boolean {
  return order.kind !== 'repair' || Number.isSafeInteger(order.targetHits) && order.targetHits! > 0;
}
export interface WorkTaskPorts<Context> {
  identity(context: Context): { name: string; id: string };
  run(context: Context, payload: WorkTaskPayload, owner: string): Outcome;
  supply?: {
    energy(context: Context): number;
    free(context: Context): number;
    collect(context: Context, payload: WorkTaskPayload, owner: string): Outcome;
  };
}
export function createWorkTaskBehavior<Context>(ports: WorkTaskPorts<Context>): TaskBehavior<Context> {
  return { phases: ['work', 'collect'], validPayload: validWorkPayload, handlers: task => {
    const payload = task.payload as WorkTaskPayload;
    function guarded(context: Context, action: (owner: string) => Outcome): Outcome {
      const unit = ports.identity(context);
      if (unit.id !== payload.unitId) return { status: 'failed', reason: 'worker-replaced' };
      const result = action(taskScope(unit.name, task.id));
      return result.status === 'blocked' ? { status: 'running' } : result;
    }
    return {
      work: context => guarded(context, owner => ports.supply?.energy(context) === 0
        ? { status: 'transition', phase: 'collect' } : ports.run(context, payload, owner)),
      collect: context => guarded(context, owner => collectWorkEnergy(ports, context, payload, owner)),
    };
  } };
}
function collectWorkEnergy<Context>(ports: WorkTaskPorts<Context>, context: Context, payload: WorkTaskPayload, owner: string): Outcome {
  if (!ports.supply) return { status: 'failed', reason: 'worker-supply-unavailable' };
  if (ports.supply.free(context) === 0) return { status: 'transition', phase: 'work' };
  const result = ports.supply.collect(context, payload, owner);
  return result.status === 'done' ? { status: 'transition', phase: 'work' } : result;
}
