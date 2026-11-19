import type { StatePort } from '../../../persistence/versioned-state';
import type { RemoteOutpostDemand } from '../../../features/remotes/infrastructure/model';
import { selectRemoteInfrastructureWork } from '../../../features/remotes/infrastructure/work';
import { movementPosition } from '../../../adapters/screeps/movement-traffic';
import { createNativeRemoteOutpostView } from './outpost-view';
import type { NativeRemoteOptions } from '../native-movement';
/** Every view resolves live authority and current visible sites; plans alone never authorize build intents. */
export function createNativeRemoteWorkContext(state: StatePort, options: NativeRemoteOptions) {
  const observe = createNativeRemoteOutpostView(state,options);
  return (creep: Creep, input: RemoteOutpostDemand, current?: string) => {
    if (!options.guard() || !workerHome(creep,input.home)) return undefined;
    const view = observe(input);
    if (!view?.policy.allowedRooms?.includes(creep.pos.roomName)) return undefined;
    const order = selectRemoteInfrastructureWork(view.record,view.demand,Game.time,view.sites,movementPosition(creep.pos),view.rooms,current);
    return order && options.guard() ? { demand: view.demand,order,policy: view.policy } : undefined;
  };
}
function workerHome(creep: Creep, name: string): Room | undefined {
  if (creep.spawning || creep.getActiveBodyparts(WORK) < 1) return undefined;
  const room = Game.rooms[name];
  return room?.controller?.my && room.controller.owner?.username === creep.owner.username ? room : undefined;
}
