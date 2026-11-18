import { plannedMobility } from '../../../adapters/screeps/travel-estimate';
import { createNativePathSearch } from '../../../adapters/screeps/path-search';
import type { createMatrixSnapshots } from '../../../adapters/screeps/matrix-snapshots';
import type { BodyPart } from '../../../capabilities/spawning/body';
import type { Position } from '../../../capabilities/movement/step';
import { prepareRemoteMatrices } from './matrices';
import type { RemoteEstimateContext, RemoteTravelResult } from '../../../features/remotes/assessment-model';
interface LegRequest { origin: Position; destination: Position; body: readonly BodyPart[]; load: number }
export function measureRemoteTravel(context: RemoteEstimateContext, origin: Position, rooms: string[], maximumOps: number,
  snapshots: ReturnType<typeof createMatrixSnapshots>, guard: () => boolean): RemoteTravelResult {
  const { miner,hauler } = context.request.economics;
  const search = (leg: LegRequest) => measureLeg(context,leg,rooms,maximumOps,snapshots,guard);
  const mining = search({ origin,destination: context.target,body: miner.body,load: 0 });
  if (mining.status !== 'complete') return mining;
  const outbound = search({ origin,destination: context.target,body: hauler.body,load: 0 });
  if (outbound.status !== 'complete') return outbound;
  const capacity = hauler.body.filter(part => part === 'carry').length * 50;
  const inbound = search({ origin: outbound.arrival,destination: origin,body: hauler.body,load: capacity });
  if (inbound.status !== 'complete') return inbound;
  return { status: 'complete',minerTicks: mining.ticks,outboundTicks: outbound.ticks,returnTicks: inbound.ticks,
    rooms: [...rooms],operations: mining.operations+outbound.operations+inbound.operations };
}
function measureLeg(context: RemoteEstimateContext, leg: LegRequest, rooms: string[], maximumOps: number,
  snapshots: ReturnType<typeof createMatrixSnapshots>, guard: () => boolean) {
  if (!guard()) return { status: 'deferred' as const,reason: 'admission' };
  const mobility = plannedMobility(leg.body,leg.load);
  if (!mobility.mobile) return { status: 'deferred' as const,reason: 'immobile' };
  const matrices = prepareRemoteMatrices(context,rooms,mobility.roadCost,snapshots);
  if (!guard()) return { status: 'deferred' as const,reason: 'admission' };
  const result = createNativePathSearch(matrices.matrix)({ origin: leg.origin,destination: leg.destination,range: 1,allowedRooms: rooms,
    profile: { id: 'remote-static',plainCost: mobility.plainCost,swampCost: mobility.swampCost,maxOps: maximumOps,maxRooms: rooms.length },
    topologyVersion: matrices.version,policyVersion: 'remote-assessment-v1' });
  if (result.status !== 'complete') return { status: 'deferred' as const,reason: 'path-incomplete' };
  return { status: 'complete' as const,ticks: result.cost,operations: result.operations,arrival: result.path.at(-1) ?? leg.origin };
}
