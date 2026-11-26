import { spawnExitTiles } from './spawn-exit-control';
import { createOwnedTileClearance } from './owned-tile-clearance';
import type { OwnedClearanceTile } from './owned-tile-clearance';
import { samePoint } from '../adapters/screeps/spawn-exits';
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
export function createNativeDispatch(state: StatePort, acceptSpawn: (request: SpawnRequest) => boolean = () => true, physicalEnergy?: NativeSpawnEnergyAdmission, observeServices: () => readonly OwnedClearanceTile[] = () => []) {
  const arbiter = createActionArbiter(() => Game.time);
  let services: readonly OwnedClearanceTile[] = [];
  const movement = createMovementService(arbiter,{ avoid: name => services.filter(tile => !tile.allowed.includes(name)).map(tile => tile.position),
    permits: (unit,destination) => services.every(tile => !samePoint(tile.position,destination) || tile.allowed.some(name => Game.creeps[name]?.id === unit)) });
  const clearExits = createOwnedTileClearance(arbiter,movement,() => [...spawnExitTiles(),...services]);
  const structures = createNativeStructureActions(state, populationMemory,physicalEnergy);
  const observe = () => {
    const view = observeSpawning();
    return { ...view, slots: view.slots.filter(slot => structures.availableSpawn(slot.id)),
      energy: Object.fromEntries(Object.entries(view.energy).map(([room, energy]) => [room, structures.availableEnergy(room, energy)])) };
  };
  const spawn = createSpawnCoordinator(state,
    { clock: () => Game.time, invoke: assignment => acceptSpawn(assignment.request) ? structures.spawn(assignment) : ERR_NOT_OWNER }, observe, 'skip',physicalEnergy ? assignment => structures.preflightSpawn(assignment) : undefined);
  let activeTick = -1;
  return {
    arbiter, movement, structures, controllers: createNativeControllerActions(state, arbiter),
    prepare() { services = observeServices(); if (clearExits()) activeTick = Game.time; },
    activate() { activeTick = Game.time; },
    flush() {
      if (activeTick !== Game.time) return;
      activeTick = -1;
      spawn();
      movement.flush();
    },
  };
}
