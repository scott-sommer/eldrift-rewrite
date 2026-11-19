import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { RemoteOutpostDemand } from '../../../../features/remotes/infrastructure/model';
import { remoteConstructionOwner } from '../../../../features/remotes/infrastructure/worker-identity';
import { remoteInfrastructureWorkOrders } from '../../../../features/remotes/infrastructure/work';
import { movementPosition } from '../../../../adapters/screeps/movement-traffic';
import { createNativeRemoteOutpostView } from '../outpost-view';
import { createNativeConstructionTravel } from '../worker-travel';
import { nativeRemoteTraversalFor } from '../../management/policy';
import { healthyConstructionWorker } from './model';
import type { ConstructionHomeSnapshot, NativeConstructionPlan } from './model';
export function createNativeConstructionQuote(state: StatePort) {
  const travel = createNativeConstructionTravel(state);
  return (demand: RemoteOutpostDemand, config: Readonly<RuntimeConfig>, guard: () => boolean, snapshot: ConstructionHomeSnapshot): NativeConstructionPlan | undefined => {
    const view = createNativeRemoteOutpostView(state,{ maximumRooms: config.remoteMaximumRouteRooms,guard,policy: (_home,username) => nativeRemoteTraversalFor(username,config) })(demand);
    const anchor = snapshot.home.storage ?? snapshot.home.find(FIND_MY_SPAWNS)[0];
    if (!view || !anchor) return undefined;
    const orders = remoteInfrastructureWorkOrders(view.record,demand,Game.time,view.sites,movementPosition(anchor.pos),view.rooms);
    if (!orders.length) return undefined;
    const timing = travel(view,snapshot.body.parts,guard);
    if (!timing) return undefined;
    const owner = remoteConstructionOwner({ home: demand.home,room: demand.room,generation: demand.generation });
    const units = snapshot.roster.filter(unit => unit.owner === owner).map(unit => Game.creeps[unit.name]!);
    const ids = new Set(orders.map(order => order.id));
    const remainingEnergy = view.sites.filter(site => ids.has(site.id)).reduce((sum,site) => sum+site.total-site.progress,0);
    return { owner,demand,body: snapshot.body,timing,remainingEnergy,bodyCost: snapshot.body.cost,
      carriedEnergy: units.reduce((sum,unit) => sum+unit.store.energy,0),present: units.length > 0 || snapshot.pending.some(request => request.owner === owner),
      effective: units.some(unit => serviceable(unit,snapshot.body.parts,timing.retireTicks)) };
  };
}
function serviceable(creep: Creep, body: readonly string[], retire: number): boolean {
  return healthyConstructionWorker(creep,body) && (creep.spawning || (creep.ticksToLive ?? 0) > retire);
}
