import type { StatePort } from '../../../persistence/versioned-state';
import type { RemoteOutpostDemand } from '../../../features/remotes/infrastructure/model';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { createRemoteInfrastructureStore } from '../../../features/remotes/infrastructure/store';
import { movementPosition } from '../../../adapters/screeps/movement-traffic';
import { createRemoteObservationRefresh } from '../native-observations';
import { nativeRemoteRoute } from '../native-route';
import type { NativeRemoteOptions } from '../native-movement';
/** Recruitment and service use the same current assignment, corridor, plans and visible-site authority. */
export function createNativeRemoteOutpostView(state: StatePort, options: NativeRemoteOptions) {
  const assignments = createRemoteAssignmentStore(state), refresh = createRemoteObservationRefresh(state);
  return (input: RemoteOutpostDemand) => {
    if (!options.guard()) return undefined;
    const demand = assignments.resolve(input,Game.time), home = Game.rooms[input.home];
    if (demand?.kind !== 'outpost' || demand.home !== input.home || !home?.controller?.my) return undefined;
    const username = home.controller.owner!.username;
    refresh([demand.home,demand.room]);
    if (!constructible(demand.room,demand.home,username)) return undefined;
    const policy = nativeRemoteRoute(state,demand.home,demand.room,options.policy(demand.home,username),options.maximumRooms,false,options.guard);
    if (!policy?.allowedRooms) return undefined;
    refresh(policy.allowedRooms);
    const rooms = policy.allowedRooms.filter(room => constructible(room,demand.home,username));
    const record = createRemoteInfrastructureStore(state,demand.home,demand.room).read();
    const sites = Object.values(Game.constructionSites).map(site => ({ id: site.id,type: site.structureType,position: movementPosition(site.pos),
      owned: site.my,ready: !!Game.rooms[site.pos.roomName],progress: site.progress,total: site.progressTotal }));
    return options.guard() ? { demand,home,record,policy,rooms,sites } : undefined;
  };
}
function constructible(name: string, home: string, username: string): boolean {
  const room = Game.rooms[name];
  if (!room) return false;
  if (name === home) return !!room.controller?.my;
  const controller = room.controller;
  return !controller?.owner && (!controller?.reservation || controller.reservation.username === username);
}
