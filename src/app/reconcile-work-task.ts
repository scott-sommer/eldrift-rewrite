import type { WorkOrder } from '../capabilities/work/assessment';
import { openState, saveState } from '../persistence/versioned-state';
import type { StatePort } from '../persistence/versioned-state';
import { taskSchema } from '../persistence/tasks/schema';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { stateKey } from '../persistence/state-key';
import { createReservationCleanup } from '../persistence/reservation-cleanup';
import { taskScope } from './task-runner';
import { validWorkPayload } from './work-task';
import type { WorkTaskPayload } from './work-task';
/** Reconcile only this worker's work head; unrelated tasks are never silently overwritten. */
export function reconcileWorkTask(state: StatePort, definitions: Readonly<Record<string, TaskDefinition>>,
  unit: { name: string; id: string; home: string }, tick: number, select: (current?: WorkOrder) => WorkOrder | undefined): void {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid work tick');
  const schema = taskSchema(unit.name, definitions);
  const key = stateKey('tasks', unit.name);
  const tasks = openState(state, key, schema);
  const previous = tasks.queue[0];
  if (previous && previous.kind !== 'work') return;
  const payload = previous?.payload as WorkTaskPayload | undefined;
  const current = payload?.unitId === unit.id ? payload.order : undefined;
  const order = select(current);
  if (order && !validWorkPayload({ home: unit.home, unitId: unit.id, order })) throw new Error('Invalid selected work');
  if (previous && current && order && previous.expiresAt > tick && sameWork(current, order)) return;
  if (previous) {
    createReservationCleanup(state).releaseScope(taskScope(unit.name, previous.id));
    tasks.queue.shift();
  }
  if (order) tasks.queue.unshift({ id: 'work:' + JSON.stringify([unit.id, order.kind, order.id, tick]), kind: 'work', phase: 'work',
    payload: { home: unit.home, unitId: unit.id, order }, wakeAt: tick, retries: 0, expiresAt: tick + 100 });
  saveState(state, key, schema, tasks);
}

/** Scores change with distance and progress; they are selection hints, not task identity. */
function sameWork(current: WorkOrder, next: WorkOrder): boolean {
  return current.id === next.id && current.kind === next.kind && current.targetHits === next.targetHits
    && JSON.stringify(current.position) === JSON.stringify(next.position);
}
