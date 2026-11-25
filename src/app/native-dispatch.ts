import type { NativeSpawnEnergyAdmission } from '../adapters/screeps/spawn-energy-admission';
import { createNativeControllerActions } from '../adapters/screeps/controller-actions';
import { createActionArbiter } from '../core/execution/action-arbiter';
import { createMovementService } from '../adapters/screeps/movement-service';
import { createNativeStructureActions } from '../adapters/screeps/structure-actions';
import { populationMemory, observeSpawning } from '../adapters/screeps/population';
import { createSpawnCoordinator } from '../features/population/spawn-coordinator';
import type { SpawnRequest } from '../capabilities/spawning/request';
import type { StatePort } from '../persistence/versioned-state';

/** One application-owned dispatch boundary shared by every gameplay feature. */
export function createNativeDispatch(state: StatePort, acceptSpawn: (request: SpawnRequest) => boolean = () => true, physicalEnergy?: NativeSpawnEnergyAdmission) {
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const structures = createNativeStructureActions(state, populationMemory,physicalEnergy);
  const observe = () => {
    const view = observeSpawning();
    return { ...view, slots: view.slots.filter(slot => structures.availableSpawn(slot.id)),
      energy: Object.fromEntries(Object.entries(view.energy).map(([room, energy]) => [room, structures.availableEnergy(room, energy)])) };
  };
  const spawn = createSpawnCoordinator(state,
    { clock: () => Game.time, invoke: assignment => acceptSpawn(assignment.request) ? structures.spawn(assignment) : ERR_NOT_OWNER }, observe, 'skip');
  let activeTick = -1;
  return {
    arbiter, movement, structures, controllers: createNativeControllerActions(state, arbiter),
    activate() { activeTick = Game.time; },
    flush() {
      if (activeTick !== Game.time) return;
      activeTick = -1;
      spawn();
      movement.flush();
    },
  };
}
