import type { StatePort } from '../versioned-state';
import { openState, saveState } from '../versioned-state';
import { createReservations } from '../reservations/store';
import { taskSchema } from './schema';
import type { TaskDefinition } from './schema';

/** Caller must confirm retirement; loss of room visibility is not evidence of death. */
export function retireUnitTasks(port: StatePort, unit: string, definitions: Readonly<Record<string, TaskDefinition>>): void {
  const schema = taskSchema(unit, definitions);
  const key = `tasks/${unit}`;
  const state = openState(port, key, schema);
  // Release first so replay after a reset also cleans up claims.
  createReservations(port).releaseHolder(unit);
  state.queue = [];
  saveState(port, key, schema, state);
}
