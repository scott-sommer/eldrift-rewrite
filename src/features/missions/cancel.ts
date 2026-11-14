import { stateKey } from '../../persistence/state-key';
import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { createReservationCleanup } from '../../persistence/reservation-cleanup';
import { missionSchema } from './state';
import type { StageContract } from './model';
export function cancelMission(port: StatePort, id: string, contracts: Readonly<Record<string, StageContract>>): void {
  const schema = missionSchema(id, contracts);
  const key = stateKey('missions', id);
  const state = openState(port, key, schema);
  if (state.status === 'completed') throw new Error('Completed mission cannot be cancelled');
  // Release first; a reset before saving cancellation can safely replay this operation.
  createReservationCleanup(port).releaseScope(`mission:${id}`);
  state.status = 'cancelled';
  state.units = [];
  saveState(port, key, schema, state);
}


