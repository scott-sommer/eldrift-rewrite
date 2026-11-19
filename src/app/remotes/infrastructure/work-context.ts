import type { StatePort } from '../../../persistence/versioned-state';
import type { RemoteOutpostDemand } from '../../../features/remotes/infrastructure/model';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { createRemoteInfrastructureStore } from '../../../features/remotes/infrastructure/store';
import { selectRemoteInfrastructureWork } from '../../../features/remotes/infrastructure/work';
import { movementPosition } from '../../../adapters/screeps/movement-traffic';
import { createRemoteObservationRefresh } from '../native-observations';
import { nativeRemoteRoute } from '../native-route';
import type { NativeRemoteOptions } from '../native-movement';
/** Every view resolves live authority and current visible sites; plans alone never authorize build intents. */
export function createNativeRemoteWorkContext(state: StatePort, options: NativeRemoteOptions) {
  const assignments = createRemoteAssignmentStore(state), refresh = createRemoteObservationRefresh(state);
  return (creep: Creep, input: RemoteOutpostDemand, current?: string) => {
    if (!options.guard()) return undefined;
    const demand = assignments.resolve(input,Game.time), home = workerHome(creep,input.home);
    if (demand?.kind !== 'outpost' || demand.home !== input.home || !home?.controller?.my) return undefined;
    const username = home.controller.owner!.username;
    refresh([demand.home,demand.room,creep.pos.roomName]);
    if (!constructible(demand.room,demand.home,username)) return undefined;
    const policy = nativeRemoteRoute(state,demand.home,demand.room,options.policy(demand.home,username),options.maximumRooms,false,options.guard);
    if (!policy?.allowedRooms?.includes(creep.pos.roomName)) return undefined;
    const rooms = policy.allowedRooms.filter(room => constructible(room,demand.home,username));
    const record = createRemoteInfrastructureStore(state,demand.home,demand.room).read();
    const sites = Object.values(Game.constructionSites).map(site => ({ id: site.id,type: site.structureType,position: movementPosition(site.pos),
      owned: site.my,ready: !!Game.rooms[site.pos.roomName],progress: site.progress,total: site.progressTotal }));
    const order = selectRemoteInfrastructureWork(record,demand,Game.time,sites,movementPosition(creep.pos),rooms,current);
    return order && options.guard() ? { demand,order,policy } : undefined;
  };
}
function constructible(name: string, home: string, username: string): boolean {
  const room = Game.rooms[name];
  if (!room) return false;
  if (name === home) return !!room.controller?.my;
  const controller = room.controller;
  return !controller?.owner && (!controller?.reservation || controller.reservation.username === username);
}

function workerHome(creep: Creep, name: string): Room | undefined {
  if (creep.spawning || creep.getActiveBodyparts(WORK) < 1) return undefined;
  const room = Game.rooms[name];
  return room?.controller?.my && room.controller.owner?.username === creep.owner.username ? room : undefined;
}
