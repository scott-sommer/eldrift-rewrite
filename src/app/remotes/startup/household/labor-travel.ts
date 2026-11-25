import { createMatrixSnapshots } from '../../../../adapters/screeps/matrix-snapshots';
import { createNativePathSearch } from '../../../../adapters/screeps/path-search';
import { plannedMobility } from '../../../../capabilities/movement/planned-mobility';
import { quoteLaborTravel } from '../../../../capabilities/economy/startup/household/labor/travel';
import type { LaborTravelPlan, LaborTravelLeg, LaborTravelMeasure } from '../../../../capabilities/economy/startup/household/labor/travel-model';
/** Read-only visible-room geometry; does not authorize stock, paid births or target work. */
export function createNativeLaborTravel(maximumOps: number) {
  if (!Number.isSafeInteger(maximumOps) || maximumOps < 1 || maximumOps > 100000) throw new Error('Invalid labor path budget');
  const snapshots = createMatrixSnapshots();
  const measure: LaborTravelMeasure = (leg,guard) => {
    if (!guard()) return { status: 'deferred',reason: 'admission' };
    const room = Game.rooms[leg.origin.room]; if (!room) return { status: 'deferred',reason: 'unseen' };
    if (leg.origin.x === leg.destination.x && leg.origin.y === leg.destination.y) return { status: 'complete',path: [],terrain: [],operations: 0 };
    return search(room,leg,maximumOps,snapshots);
  };
  return (plan: LaborTravelPlan, guard: () => boolean = () => true) => quoteLaborTravel(plan,JSON.stringify(['native-labor-route-v1',Game.time]),measure,guard);
}
function search(room: Room, leg: LaborTravelLeg, maximumOps: number, snapshots: ReturnType<typeof createMatrixSnapshots>) {
  const mobility = plannedMobility(leg.body,leg.load);
  if (!mobility.mobile) return { status: 'deferred' as const,reason: 'immobile' };
  const prepared = snapshots.prepare([room.name],{ roadCost: mobility.roadCost,avoidUnits: false });
  const result = createNativePathSearch(prepared.matrix)({ origin: leg.origin,destination: leg.destination,range: 0,allowedRooms: [room.name],
    profile: { id: 'labor-route',plainCost: mobility.plainCost,swampCost: mobility.swampCost,maxOps: maximumOps,maxRooms: 1 },topologyVersion: prepared.version,policyVersion: 'labor-route-v1' });
  if (result.status !== 'complete') return { status: 'deferred' as const,reason: 'path-incomplete' };
  return { status: 'complete' as const,path: result.path,operations: result.operations,terrain: terrainRates(room,result.path) };
}
function terrainRates(room: Room, path: readonly { x: number; y: number }[]): (1 | 2 | 10)[] {
  const roads = new Set(room.find(FIND_STRUCTURES).filter(point => point.structureType === STRUCTURE_ROAD).map(point => point.pos.x*50+point.pos.y));
  const ground = room.getTerrain();
  return path.map(point => roads.has(point.x*50+point.y) ? 1 : ground.get(point.x,point.y) & TERRAIN_MASK_SWAMP ? 10 : 2);
}
