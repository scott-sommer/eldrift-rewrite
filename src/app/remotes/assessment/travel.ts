import { pathTravelClock } from '../../../adapters/screeps/path-travel-clock';
import { validWorldPosition } from '../../../core/geometry/world-position';
import { plannedMobility } from '../../../adapters/screeps/travel-estimate';
import { createNativePathSearch } from '../../../adapters/screeps/path-search';
import type { createMatrixSnapshots } from '../../../adapters/screeps/matrix-snapshots';
import type { BodyPart } from '../../../capabilities/spawning/body';
import type { Position } from '../../../capabilities/movement/step';
import { prepareRemoteMatrices } from './matrices';
import type { RemoteEstimateContext, RemoteTravelResult } from '../../../features/remotes/assessment-model';
export interface RemoteLegRequest { origin: Position; destination: Position; body: readonly BodyPart[]; load: number; range?: number; blocked?: readonly Position[]; clock?: 'action' }
export function measureRemoteTravel(context: RemoteEstimateContext, origin: Position, rooms: string[], maximumOps: number,
  snapshots: ReturnType<typeof createMatrixSnapshots>, guard: () => boolean): RemoteTravelResult {
  const { miner,hauler } = context.request.economics;
  const search = (leg: RemoteLegRequest) => measureRemoteLeg(context,leg,rooms,maximumOps,snapshots,guard);
  const mining = search({ origin,destination: context.target,body: miner.body,load: 0 });
  if (mining.status !== 'complete') return mining;
  const outbound = search({ origin,destination: context.target,body: hauler.body,load: 0 });
  if (outbound.status !== 'complete') return outbound;
  const capacity = hauler.body.filter(part => part === 'carry').length * 50;
  const inbound = search({ origin: outbound.arrival,destination: origin,body: hauler.body,load: capacity });
  if (inbound.status !== 'complete') return inbound;
  const returningMiner = search({ origin: mining.arrival,destination: origin,body: miner.body,load: miner.body.filter(part => part === 'carry').length*50 });
  if (returningMiner.status !== 'complete') return returningMiner;
  return { status: 'complete',minerReturnTicks: returningMiner.ticks,minerTicks: mining.ticks,outboundTicks: outbound.ticks,returnTicks: inbound.ticks,
    rooms: [...rooms],operations: mining.operations+outbound.operations+inbound.operations+returningMiner.operations };
}
export function measureRemoteLeg(context: Pick<RemoteEstimateContext, 'intel'>, leg: RemoteLegRequest, rooms: string[], maximumOps: number,
  snapshots: ReturnType<typeof createMatrixSnapshots>, guard: () => boolean) {
  if (!guard()) return { status: 'deferred' as const,reason: 'admission' };
  const mobility = plannedMobility(leg.body,leg.load);
  if (!mobility.mobile) return { status: 'deferred' as const,reason: 'immobile' };
  const matrices = prepareRemoteMatrices(context,rooms,mobility.roadCost,snapshots);
  if (!guard()) return { status: 'deferred' as const,reason: 'admission' };
  const result = createNativePathSearch(legMatrices(matrices,leg.blocked))({ origin: leg.origin,destination: leg.destination,range: leg.range ?? 1,allowedRooms: rooms,
    profile: { id: 'remote-static',plainCost: mobility.plainCost,swampCost: mobility.swampCost,maxOps: maximumOps,maxRooms: rooms.length },
    topologyVersion: JSON.stringify([matrices.version,leg.blocked ?? []]),policyVersion: 'remote-assessment-v1' });
  if (result.status !== 'complete') return { status: 'deferred' as const,reason: 'path-incomplete' };
  const ticks = leg.clock === 'action' ? pathTravelClock(leg.origin,result.path,mobility,point => terrainRate(point,matrices,mobility.roadCost)) : result.cost;
  if (ticks === undefined) return { status: 'deferred' as const,reason: 'path-clock' };
  return { status: 'complete' as const,ticks,operations: result.operations,arrival: result.path.at(-1) ?? leg.origin };
}

/** Request-local overlays never change shared topology snapshots or another body's measurement. */
function legMatrices(matrices: ReturnType<typeof prepareRemoteMatrices>, blocked: readonly Position[] = []) {
  if (blocked.length > 64 || !blocked.every(validWorldPosition)) throw new Error('Invalid remote leg exclusions');
  return (room: string) => {
    const matrix = matrices.matrix(room);
    if (matrix) for (const point of blocked.filter(point => point.room === room)) matrix.set(point.x,point.y,255);
    return matrix;
  };
}

function terrainRate(point: Position, matrices: ReturnType<typeof prepareRemoteMatrices>, roadCost: number): 1 | 2 | 10 {
  const matrix = matrices.matrix(point.room);
  if (matrix && matrix.get(point.x,point.y) === roadCost) return 1;
  return Game.map.getRoomTerrain(point.room).get(point.x,point.y) & TERRAIN_MASK_SWAMP ? 10 : 2;
}
