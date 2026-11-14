import type { BodyPart } from '../../capabilities/spawning/body';
import type { Position } from '../../capabilities/movement/step';
import { mobilityCosts } from '../../capabilities/movement/mobility';
import { createPathService } from '../../capabilities/movement/path-service';
import type { PathRequest, PathSearch } from '../../capabilities/movement/path-model';
import { createMatrixSnapshots } from './matrix-snapshots';
import { createNativePathSearch } from './path-search';
export function plannedMobility(body: readonly BodyPart[], load: number) {
  return mobilityCosts(body.map(type => ({ kind: type === 'move' ? 'move' : type === 'carry' ? 'carry' : 'other',
    active: true, movePower: type === 'move' ? 1 : 0, carryCapacity: type === 'carry' ? 50 : 0 })), load);
}
/** Static, terrain/body-aware travel estimate. Dynamic traffic delay belongs to route policy. */
export function createTravelEstimator() {
  const snapshots = createMatrixSnapshots();
  const searches = new WeakMap<PathRequest, PathSearch>();
  const paths = createPathService(request => searches.get(request as PathRequest)!(request), () => Game.time);
  return (origin: Position, destination: Position, body: readonly BodyPart[], load: number) => {
    if (origin.room !== destination.room || !Game.rooms[origin.room]) return undefined;
    const mobility = plannedMobility(body, load);
    if (!mobility.mobile) return undefined;
    const prepared = snapshots.prepare([origin.room], { roadCost: mobility.roadCost, avoidUnits: false });
    const request: PathRequest = { origin, destination, range: 1, allowedRooms: [origin.room],
      profile: { id: 'courier-travel', plainCost: mobility.plainCost, swampCost: mobility.swampCost, maxOps: 4000, maxRooms: 1 },
      topologyVersion: prepared.version, policyVersion: 'owned-courier-travel' };
    searches.set(request, createNativePathSearch(prepared.matrix));
    const result = paths.find(request);
    return result.status === 'complete' ? { ticks: result.cost, arrival: result.path.at(-1) ?? origin } : undefined;
  };
}
