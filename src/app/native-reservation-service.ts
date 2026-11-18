import type { Position } from '../capabilities/movement/step';
import { movementArrived } from '../capabilities/movement/step';
import type { Outcome } from '../core/execution/model';
import type { StatePort } from '../persistence/versioned-state';
import type { IntelTraversalPolicy } from '../features/intel/traversal-model';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import type { createNativeDispatch } from './native-dispatch';
import type { ReservationDemand, ReservationTaskPorts } from './reservation-task';
import { nativeRemoteRoute } from './native-remote-route';
import { createRemoteObservationRefresh } from './native-remote-observations';
export interface NativeReservationOptions {
  policy(home: string, username: string): IntelTraversalPolicy;
  maximumRooms: number; guard(): boolean;
  refuge?(home: string): Position | undefined;
}
/** Reads current observations and uses shared movement/controller dispatch; no private actuator or memory root. */
export function createNativeReservationService(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, options: NativeReservationOptions): ReservationTaskPorts<Creep> {
  const refresh = createRemoteObservationRefresh(state);
  function move(creep: Creep, home: string, destination: Position, owner: string, retreat: boolean, range: number): Outcome {
    const policy = nativeRemoteRoute(state,creep.pos.roomName,destination.room,options.policy(home,creep.owner.username),
      options.maximumRooms,retreat,options.guard);
    if (!policy) return { status: 'running' };
    dispatch.activate();
    return dispatch.movement.move(creep,{ owner,destination,range,policy });
  }
  function retire(creep: Creep, home: string, owner: string): Outcome {
    if (creep.spawning || !options.guard()) return { status: 'running' };
    refresh([home,creep.pos.roomName]);
    const destination = refuge(home,options);
    return destination ? move(creep,home,destination,owner,true,3) : { status: 'running' };
  }
  function service(creep: Creep, demand: ReservationDemand, owner: string): Outcome {
    if (creep.spawning || !options.guard()) return { status: 'running' };
    refresh([demand.home,demand.room,creep.pos.roomName]);
    const target = demand.controller;
    if (!readyHome(creep,demand.home)) return waitAtHome(creep,demand.home,owner);
    const policy = nativeRemoteRoute(state,creep.pos.roomName,target.position.room,options.policy(demand.home,creep.owner.username),
      options.maximumRooms,false,options.guard);
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
function refuge(home: string, options: NativeReservationOptions): Position | undefined {
  const room = Game.rooms[home];
  if (!room?.controller?.my) return undefined;
  const selected = options.refuge?.(home);
  if (selected) return selected.room === home ? selected : undefined;
  const anchor = room.storage ?? room.find(FIND_MY_SPAWNS).sort((a,b) => a.name.localeCompare(b.name))[0];
  return anchor ? movementPosition(anchor.pos) : undefined;
}

function readyHome(creep: Creep, home: string): boolean {
  return !!Game.rooms[home]?.controller?.my && creep.getActiveBodyparts(CLAIM) > 0;
}
function atController(creep: Creep, controller: StructureController | undefined, destination: Position): boolean {
  return !!controller && movementArrived({ position: movementPosition(creep.pos),destination,range: 1 });
}
