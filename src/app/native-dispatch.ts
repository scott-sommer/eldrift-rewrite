import { createActionArbiter } from '../core/execution/action-arbiter';
import { createMovementService } from '../adapters/screeps/movement-service';
import { createNativeSpawn } from '../adapters/screeps/spawn';
import { populationMemory, observeSpawning } from '../adapters/screeps/population';
import { createSpawnCoordinator } from '../features/population/spawn-coordinator';
import type { StatePort } from '../persistence/versioned-state';

/** One application-owned dispatch boundary shared by every gameplay feature. */
export function createNativeDispatch(state: StatePort) {
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const spawn = createSpawnCoordinator(state,
    { clock: () => Game.time, invoke: createNativeSpawn(populationMemory) }, observeSpawning, 'skip');
  let activeTick = -1;
  return {
    arbiter, movement,
    activate() { activeTick = Game.time; },
    flush() {
      if (activeTick !== Game.time) return;
      activeTick = -1;
      spawn();
      movement.flush();
    },
  };
}
