import { logisticsPool } from '../../capabilities/logistics/request';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
import type { TransferObject } from './transfer-target';
export function logisticsEndpoint(id: string): TransferObject | null {
  return Game.getObjectById(id as Id<TransferObject>);
}
export function observeHauling(creep: Creep, request: LogisticsRequest, expectedSinkRoom?: string) {
  const resource = request.resource as ResourceConstant;
  const source = logisticsEndpoint(request.source);
  const sink = logisticsEndpoint(request.sink);
  const { sinkRoom, sinkStatus } = destinationStatus(sink, expectedSinkRoom);
  const minimumCollection = pickupMinimum(source, resource, creep.store.getFreeCapacity(resource) ?? 0);
  return { minimumCollection, sinkStatus, ...(sinkRoom ? { sinkRoom } : {}), tick: Game.time, cargo: creep.store.getUsedCapacity(resource) ?? 0,
    freeCargo: creep.store.getFreeCapacity(resource) ?? 0,
    sourceStock: sourceStock(source, resource), sinkFree: sinkCapacity(sink, resource),
    sinkPool: capacityPool(request.sink, sink, resource) };
}
function sourceStock(source: TransferObject | null, resource: ResourceConstant): number {
  if (!source) return 0;
  if ('resourceType' in source) return source.resourceType === resource ? source.amount : 0;
  if ('body' in source || 'powers' in source) return 0;
  return source.store.getUsedCapacity(resource) ?? 0;
}
function sinkCapacity(sink: TransferObject | null, resource: ResourceConstant): number {
  if (!sink || !('store' in sink) || !('structureType' in sink || 'body' in sink || 'powers' in sink)) return 0;
  if ('isActive' in sink && !sink.isActive()) return 0;
  return sink.store.getFreeCapacity(resource) ?? 0;
}
export function capacityPool(id: string, sink: TransferObject | null, resource: ResourceConstant): string {
  if (!sink || !('store' in sink) || sink.store.getCapacity() !== null) return logisticsPool('capacity', id);
  const compartment = 'structureType' in sink && sink.structureType === 'lab' && resource !== 'energy' ? 'mineral' : resource;
  return logisticsPool('capacity', id, compartment);
}

function pickupMinimum(source: TransferObject | null, resource: ResourceConstant, free: number): number {
  return source && 'resourceType' in source ? Math.min(sourceStock(source, resource), free) : 0;
}
function destinationStatus(sink: TransferObject | null, expectedRoom?: string) {
  const sinkRoom = sink ? ('structureType' in sink ? sink.pos?.roomName : undefined) : expectedRoom;
  const sinkStatus = sink ? 'visible' as const : sinkRoom && Game.rooms[sinkRoom] ? 'missing' as const : 'unseen' as const;
  return { sinkRoom, sinkStatus };
}
