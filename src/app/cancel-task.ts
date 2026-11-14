import { openState, saveState } from '../persistence/versioned-state';
import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { taskSchema } from '../persistence/tasks/schema';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { createReservations } from '../persistence/reservations/store';
import { taskScope } from './task-runner';
/** Task IDs must not be reused while an earlier cancellation can be replayed. */
export function cancelTask(port: StatePort, unit: string, id: string, definitions: Readonly<Record<string, TaskDefinition>>): boolean {
  const schema = taskSchema(unit, definitions);
  const key = stateKey('tasks', unit);
  const state = openState(port, key, schema);
  createReservations(port).releaseScope(taskScope(unit, id));
  const remaining = state.queue.filter(task => task.id !== id);
  if (remaining.length === state.queue.length) return false;
  state.queue = remaining;
  saveState(port, key, schema, state);
  return true;
}
