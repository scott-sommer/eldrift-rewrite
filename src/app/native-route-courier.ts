import type { StatePort } from '../persistence/versioned-state';
import type { createNativeDispatch } from './native-dispatch';
import { createNativeHaulingTask } from './native-hauling-task';
import type { observeHauling } from '../adapters/screeps/hauling-observation';
import { createTaskRunner } from './task-runner';
import { selectHaulingTask } from './select-hauling-task';
import { settleHaulingTask } from './settle-hauling-task';
import { recoverNativeCargo } from './native-cargo-recovery';
import { observeTransfer } from '../adapters/screeps/transfer-observation';
import { haulingOwner } from '../features/logistics/identity';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { retireUnitTasks } from '../persistence/tasks/retire';
export interface NativeCourierRoute {
  version: string;
  target(owner: string, home: string): string | undefined;
  observe: typeof observeHauling;
}
/** Recruitment is separate: this executor owns one already-assigned courier. */
export function createNativeRouteCourier(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>,
  route: NativeCourierRoute) {
  const observe = route.observe;
  const policy = { version: route.version, blockedRooms: [], costs: {}, maximumRooms: 16 };
  const definitions = { haul: createNativeHaulingTask(state, dispatch, policy, observe) };
  const execute = createTaskRunner(state, definitions, () => Game.time);
  function retireEmpty(creep: Creep, home: string): void {
    const journal = createTransferJournal(state, creep.id).read();
    if (!journal.acknowledged || journal.result?.status === 'unknown') return;
    retireUnitTasks(state, creep.name, definitions);
    returnHome(creep, home, dispatch, route.version);
  }
  return { definitions, run(creep: Creep, active: boolean) {
    const population = creep.memory.population;
    if (!population || creep.spawning) return;
    const target = route.target(population.owner, population.home);
    if (!target) return;
    dispatch.activate();
    settleHaulingTask(state, definitions, creep, observeTransfer);
    const targetOwned = !!Game.rooms[target]?.controller?.my;
    if (shouldReturn(creep, active && targetOwned)) {
      retireEmpty(creep, population.home);
      return;
    }
    recoverNativeCargo(state, definitions, creep, targetOwned ? target : population.home, 0);
    if (active && targetOwned) selectHaulingTask(state, definitions,
      { home: population.home, name: creep.name, unitId: creep.id, tick: Game.time, cargoTotal: creep.store.getUsedCapacity() },
      request => observe(creep, request), request => request.owner === population.owner);
    execute(creep.name, creep);
  } };
}
function returnHome(creep: Creep, home: string, dispatch: ReturnType<typeof createNativeDispatch>, version: string): void {
  if (creep.pos.roomName === home && awayFromExit(creep.pos)) {
    if (Game.rooms[home]?.controller?.my) creep.memory.population!.owner = haulingOwner(home);
    return;
  }
  dispatch.movement.move(creep, { owner: creep.memory.population!.owner,
    destination: { room: home, x: 25, y: 25 }, range: 20, policy: { version, blockedRooms: [], costs: {}, maximumRooms: 16 } });
}
function shouldReturn(creep: Creep, active: boolean): boolean {
  return !active && creep.store.getUsedCapacity() === 0;
}

function awayFromExit(pos: RoomPosition): boolean { return pos.x > 0 && pos.x < 49 && pos.y > 0 && pos.y < 49; }
