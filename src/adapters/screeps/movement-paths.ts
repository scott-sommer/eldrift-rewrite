import { createRoomRouter } from '../../capabilities/movement/room-route';
import type { RoutePolicy } from '../../capabilities/movement/room-route';
import type { PathRequest, PathSearch } from '../../capabilities/movement/path-model';
import type { MovementView } from '../../capabilities/movement/step';
import { createMatrixSnapshots } from './matrix-snapshots';
import { createNativePathSearch } from './path-search';
import { findRoomRoute } from './room-route';
import { creepMobility } from './mobility';
export function createMovementPaths() {
  const snapshots = createMatrixSnapshots();
  const route = createRoomRouter(findRoomRoute);
  const searches = new WeakMap<PathRequest, PathSearch>();
  return {
    prepare(creep: Creep, view: MovementView, avoidUnits: boolean, policy: RoutePolicy): PathRequest {
      const mobility = creepMobility(creep);
      if (!mobility.mobile) throw new Error('Cannot prepare an immobile creep');
      const result = route(view.position.room, view.destination.room, policy);
      const rooms = result.status === 'complete' ? result.rooms : [];
      const prepared = snapshots.prepare(rooms, { roadCost: mobility.roadCost, avoidUnits, ignoreUnitId: creep.id });
      const request: PathRequest = {
        origin: view.position, destination: view.destination, range: view.range,
        profile: { id: 'body', plainCost: mobility.plainCost, swampCost: mobility.swampCost, maxOps: 4000, maxRooms: policy.maximumRooms },
        topologyVersion: prepared.version, policyVersion: policy.version, allowedRooms: rooms,
      };
      searches.set(request, createNativePathSearch(prepared.matrix));
      return request;
    },
    search: ((request) => {
      const search = searches.get(request);
      if (!search) throw new Error('Path request was not prepared by this service');
      return search(request);
    }) satisfies PathSearch,
    snapshots,
  };
}
