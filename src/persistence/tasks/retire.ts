import { stateKey } from '../state-key';
import type { StatePort } from '../versioned-state';
import { openState, saveState } from '../versioned-state';
import { createReservationCleanup } from '../reservation-cleanup';
import { taskSchema } from './schema';
import type { TaskDefinition } from './schema';

/** Caller must confirm retirement; loss of room visibility is not evidence of death. */
export function retireUnitTasks(port: StatePort, unit: string, definitions: Readonly<Record<string, TaskDefinition>>): void {
  const schema = taskSchema(unit, definitions);
  const key = stateKey('tasks', unit);
  const state = openState(port, key, schema);
  // Release first so replay after a reset also cleans up claims.
  createReservationCleanup(port).releaseHolder(unit);
  state.queue = [];
  saveState(port, key, schema, state);
}


