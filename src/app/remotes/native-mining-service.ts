import type { Position } from '../../capabilities/movement/step';
import type { RoutePolicy } from '../../capabilities/movement/room-route';
import type { Outcome } from '../../core/execution/model';
import type { StatePort } from '../../persistence/versioned-state';
import { createIntelStore } from '../../features/intel/store';
import { createStationAssignments } from '../../features/mining/assignments';
import { createNativeMiner } from '../../adapters/screeps/mining';
import type { createNativeDispatch } from '../native-dispatch';
import { createNativeRemoteMovement } from './native-movement';
import type { NativeRemoteOptions } from './native-movement';
import { createRemoteStationObservation } from './native-station';
import type { RemoteMiningDemand, RemoteMiningTaskPorts } from './mining-task';
export interface NativeRemoteMiningServiceOptions extends NativeRemoteOptions { station?: Position }
/** Travel uses retained intel; extraction acquires a current safe station tile through the existing mining owner. */
export function createNativeRemoteMiningService(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, options: NativeRemoteMiningServiceOptions): RemoteMiningTaskPorts<Creep> {
  const travel = createNativeRemoteMovement(state,dispatch,options), intel = createIntelStore(state);
  const assignments = createStationAssignments(state), observe = createRemoteStationObservation(state);
  const mine = createNativeMiner(dispatch.arbiter,dispatch.movement);
  function release(owner: string): void {
    if (state.read('reservations/empire') !== undefined) assignments.release(owner);
  }
  function retire(creep: Creep, home: string, owner: string): Outcome {
    release(owner); return travel.retire(creep,home,owner);
  }
  function waitAtHome(creep: Creep, home: string, owner: string): Outcome {
    retire(creep,home,owner); return { status: 'running' };
  }
  function service(creep: Creep, demand: RemoteMiningDemand, owner: string): Outcome {
    if (creep.spawning || !options.guard()) return { status: 'running' };
    if (!readyHome(creep,demand.home)) return waitAtHome(creep,demand.home,owner);
    const policy = travel.route(creep,demand.home,demand.room);
    if (!policy || !miningRoom(demand.room,creep.owner.username)) return waitAtHome(creep,demand.home,owner);
    const source = intel.peek(demand.room,Game.time).record.summary?.sources.find(source => source.id === demand.source);
    if (!source) return waitAtHome(creep,demand.home,owner);
    if (creep.pos.roomName !== demand.room) {
      return approach(creep,demand,owner,policy,source);
    }
    return extract(creep,demand,owner,policy);
  }
  function approach(creep: Creep, demand: RemoteMiningDemand, owner: string, policy: RoutePolicy, source: { x: number; y: number }): Outcome {
    release(owner); dispatch.activate();
    dispatch.movement.move(creep,{ owner,destination: options.station ?? { room: demand.room,x: source.x,y: source.y },range: options.station ? 0 : 1,policy });
    return { status: 'running' };
  }
  function extract(creep: Creep, demand: RemoteMiningDemand, owner: string, policy: RoutePolicy): Outcome {
    const station = observe(demand.room)?.find(station => station.id === demand.source);
    if (!station) return waitAtHome(creep,demand.home,owner);
    const tile = options.station ? fixedTile(station,options.station,creep.name,owner) : assignments.select(station,creep.name,owner,Game.time,2);
    if (!tile) return { status: 'running' };
    dispatch.activate();
    return mine(creep,{ owner,station,tile,assigned: true,unsafe: false,retreat: tile,policy });
  }
  function fixedTile(station: Parameters<typeof assignments.acquire>[0], tile: Position, unit: string, owner: string) {
    return assignments.acquire(station,tile,unit,owner,Game.time,2) ? tile : undefined;
  }
  return { clock: () => Game.time,unit: creep => creep.name,service,retire };
}
function miningRoom(name: string, username: string): boolean {
  const controller = Game.rooms[name]?.controller;
  return !controller?.owner && (!controller?.reservation || controller.reservation.username === username);
}

function readyHome(creep: Creep, home: string): boolean {
  return !!Game.rooms[home]?.controller?.my && creep.getActiveBodyparts(WORK) > 0;
}
