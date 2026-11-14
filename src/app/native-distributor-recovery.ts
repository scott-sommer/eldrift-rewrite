import type { StatePort } from '../persistence/versioned-state';
import { openState } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { recoverySchema } from '../features/recovery/schema';
import { recoverDistributor } from '../features/recovery/distributor-ownership';
/** Conversion follows the persisted assessment cadence, not every execution tick. */
export function recoverNativeDistributors(state: StatePort, room: string, active: boolean): void {
  if (!active) return;
  const key = stateKey('recovery', room);
  if (state.read(key) === undefined || openState(state, key, recoverySchema(room)).checkedAt !== Game.time) return;
  for (const creep of Object.values(Game.creeps)) {
    const identity = creep.memory.population;
    if (identity) creep.memory.population = recoverDistributor(identity, room);
  }
}
