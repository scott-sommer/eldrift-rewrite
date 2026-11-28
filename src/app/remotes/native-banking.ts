import { createRemoteBankingControl } from './banking-control';
import { createRemoteBankingWork } from './banking-work';
export type { RemoteBankingMode } from './banking-control';
import type { StatePort } from '../../persistence/versioned-state';
import { roomCoordinates } from '../../core/geometry/room-grid';
import { observeTransfer } from '../../adapters/screeps/transfer-observation';
import { createNativeHaulingTask } from '../native-hauling-task';
import { recoverNativeCargo } from '../native-cargo-recovery';
import { settleHaulingTask } from '../settle-hauling-task';
import type { createNativeDispatch } from '../native-dispatch';
import { createNativeRemoteMovement } from './native-movement';
import type { NativeRemoteOptions } from './native-movement';
export interface NativeRemoteBankingPolicy {
  readonly terminalReserve: number;
  readonly acceptsResource?: (resource: ResourceConstant) => boolean;
  readonly acceptsSink?: (sink: AnyStructure) => boolean;
}
/** SDK composition of shared banking control, work admission and the existing hauling owners. */
export function createNativeRemoteBanking(state: StatePort,dispatch: ReturnType<typeof createNativeDispatch>,home: string,options: NativeRemoteOptions,inputPolicy: NativeRemoteBankingPolicy = { terminalReserve: 0 }) {
  roomCoordinates(home);
  const policy = { ...inputPolicy };
  if (!Number.isSafeInteger(policy.terminalReserve) || policy.terminalReserve < 0) throw new Error('Invalid remote banking terminal reserve');
  const travel = createNativeRemoteMovement(state,dispatch,options);
  const hauling = createNativeHaulingTask(state,dispatch,{ version: 'remote-banking:'+home,maximumRooms: 1,allowedRooms: [home],blockedRooms: [],costs: {} });
  const homeReady = () => !!Game.rooms[home]?.controller?.my,routeReady = (creep: Creep) => !!travel.route(creep,home,home);
  const behavior = createRemoteBankingWork(state,home,hauling,{
    name: (creep: Creep) => creep.name,homeReady,routeReady,atHome: creep => creep.pos.roomName === home,retire: travel.retire,
    work(creep,task) { dispatch.activate(); return hauling.handlers(task).work!(creep); },
  });
  const control = createRemoteBankingControl(state,home,{
    identity: (creep: Creep) => ({ name: creep.name,id: creep.id }),
    eligible: creep => creep.my && !creep.spawning && creep.memory.population?.home === home,
    cargo: creep => creep.store.getUsedCapacity(),interior: creep => creep.pos.roomName === home && creep.pos.x > 0 && creep.pos.x < 49 && creep.pos.y > 0 && creep.pos.y < 49,
    homeReady,routeReady,settle: (creep,definitions) => settleHaulingTask(state,definitions,creep,observeTransfer),
    recover(creep,definitions) { recoverNativeCargo(state,definitions,creep,home,policy.terminalReserve,policy.acceptsResource,policy.acceptsSink); },
  });
  return { ...control,definitions: { haul: behavior } };
}
