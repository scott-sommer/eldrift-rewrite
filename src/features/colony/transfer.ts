import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { createReservationCleanup } from '../../persistence/reservation-cleanup';
import { colonySchema } from './state';
export function transferColony(port: StatePort, room: string, owner: string): void {
  const schema = colonySchema(room, owner);
  const key = `colony/${room}`;
  const state = openState(port, key, schema);
  if (state.owner === owner) return;
  createReservationCleanup(port).releaseScope(`colony:${room}:${state.owner}`);
  state.owner = owner;
  state.mode = 'bootstrap';
  state.recovery = { active: false, checkedAt: null };
  saveState(port, key, schema, state);
}

