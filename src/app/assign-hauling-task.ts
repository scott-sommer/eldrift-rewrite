import { openState, saveState } from '../persistence/versioned-state';
import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { taskSchema } from '../persistence/tasks/schema';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { createLogisticsRequests } from '../features/logistics/request-store';
import { validHaulingPayload } from './hauling-task';
import type { HaulingTaskPayload } from './hauling-task';
/** Caller supplies a unique task ID; existing work is never replaced by admission. */
export function assignHaulingTask(state: StatePort, definitions: Readonly<Record<string, TaskDefinition>>,
  unit: string, id: string, payload: HaulingTaskPayload, tick: number, expiresAt: number): boolean {
  if (!id || !validHaulingPayload(payload)) throw new Error('Invalid hauling task');
  if (![tick, expiresAt].every(value => Number.isSafeInteger(value) && value >= 0) || expiresAt <= tick) throw new Error('Invalid hauling lifetime');
  const schema = taskSchema(unit, definitions);
  const key = stateKey('tasks', unit);
  const tasks = openState(state, key, schema);
  if (tasks.queue.length > 0) return false;
  const active = createLogisticsRequests(state, payload.home).pending(tick)
    .find(request => request.owner === payload.request.owner && request.id === payload.request.id);
  if (!active) return false;
  if (active.source !== payload.request.source || active.sink !== payload.request.sink || active.resource !== payload.request.resource) throw new Error('Hauling task request mismatch');
  tasks.queue.push({ id, kind: 'haul', phase: 'work', payload, wakeAt: tick, retries: 0, expiresAt });
  saveState(state, key, schema, tasks);
  return true;
}

