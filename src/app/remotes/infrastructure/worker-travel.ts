import type { StatePort } from '../../../persistence/versioned-state';
import type { BodyPart } from '../../../capabilities/spawning/body';
import { plannedMobility } from '../../../adapters/screeps/travel-estimate';
import { createMatrixSnapshots } from '../../../adapters/screeps/matrix-snapshots';
import { createIntelStore } from '../../../features/intel/store';
import { prepareRemoteMatrices } from '../assessment/matrices';
import { remoteConstructionTravel } from '../../../features/remotes/infrastructure/worker-travel';
import type { createNativeRemoteOutpostView } from './outpost-view';
type View = NonNullable<ReturnType<ReturnType<typeof createNativeRemoteOutpostView>>>;
/** Price the admitted planned route with full CARRY and actual/retained roads, obstacles and terrain. */
export function createNativeConstructionTravel(state: StatePort) {
  const snapshots = createMatrixSnapshots(), intel = createIntelStore(state);
  return (view: View, body: readonly BodyPart[], guard: () => boolean) => {
    if (!guard()) return undefined;
    const mobility = plannedMobility(body,body.filter(part => part === 'carry').length*50);
    if (!mobility.mobile) return undefined;
    const rooms = view.policy.allowedRooms!;
    const matrices = prepareRemoteMatrices({ intel: room => intel.peek(room,Game.time).record },rooms,mobility.roadCost,snapshots);
    const costs = new Map(rooms.map(room => [room,matrices.matrix(room)]));
    const terrain = new Map(rooms.map(room => [room,Game.map.getRoomTerrain(room)]));
    return remoteConstructionTravel(view.record,CREEP_LIFE_TIME,25,point => {
      const matrix = costs.get(point.room), ground = terrain.get(point.room);
      if (typeof matrix === 'boolean' || !matrix || !ground) return undefined;
      const tile = matrix.get(point.x,point.y);
      if (tile === 255 || ground.get(point.x,point.y) === TERRAIN_MASK_WALL) return undefined;
      return tile || (ground.get(point.x,point.y) === TERRAIN_MASK_SWAMP ? mobility.swampCost : mobility.plainCost);
    },guard);
  };
}
