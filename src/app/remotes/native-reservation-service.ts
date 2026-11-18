import type { Position } from '../../capabilities/movement/step';
import { movementArrived } from '../../capabilities/movement/step';
import type { Outcome } from '../../core/execution/model';
import type { StatePort } from '../../persistence/versioned-state';
import { movementPosition } from '../../adapters/screeps/movement-traffic';
import type { createNativeDispatch } from '../native-dispatch';
import type { ReservationDemand, ReservationTaskPorts } from './reservation-task';
import { createNativeRemoteMovement } from './native-movement';
import type { NativeRemoteOptions } from './native-movement';
export type NativeReservationOptions = NativeRemoteOptions;
/** Reads current observations and uses shared movement/controller dispatch; no private actuator or memory root. */
export function createNativeReservationService(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, options: NativeReservationOptions): ReservationTaskPorts<Creep> {
  const travel = createNativeRemoteMovement(state,dispatch,options);
  const retire = travel.retire;
  function service(creep: Creep, demand: ReservationDemand, owner: string): Outcome {
    if (creep.spawning || !options.guard()) return { status: 'running' };
    const target = demand.controller;
    if (!readyHome(creep,demand.home)) return waitAtHome(creep,demand.home,owner);
    const policy = travel.route(creep,demand.home,target.position.room);
    if (!policy) return waitAtHome(creep,demand.home,owner);
    const controller = Game.rooms[demand.room]?.controller;
    if (controller && !reservable(controller,target.id,creep.owner.username)) return waitAtHome(creep,demand.home,owner);
    if (!atController(creep,controller,target.position)) {
      dispatch.activate(); dispatch.movement.move(creep,{ owner,destination: target.position,range: 1,policy });
      return { status: 'running' };
    }
    reserveAt(creep,controller!,owner);
    return { status: 'running' };
  }
  function reserveAt(creep: Creep, controller: StructureController, owner: string): void {
    const remaining = controller.reservation?.ticksToEnd ?? 0;
    if (remaining + creep.getActiveBodyparts(CLAIM) * CONTROLLER_RESERVE <= CONTROLLER_RESERVE_MAX) dispatch.controllers.reserve(creep,controller,owner);
  }
  function waitAtHome(creep: Creep, home: string, owner: string): Outcome {
    retire(creep,home,owner);
    return { status: 'running' };
  }
  return { clock: () => Game.time,unit: creep => creep.name,service,retire };
}
function reservable(controller: StructureController, expected: string, username: string): boolean {
  return controller.id === expected && !controller.owner && (!controller.reservation || controller.reservation.username === username);
}
function readyHome(creep: Creep, home: string): boolean {
  return !!Game.rooms[home]?.controller?.my && creep.getActiveBodyparts(CLAIM) > 0;
}
function atController(creep: Creep, controller: StructureController | undefined, destination: Position): boolean {
  return !!controller && movementArrived({ position: movementPosition(creep.pos),destination,range: 1 });
}
