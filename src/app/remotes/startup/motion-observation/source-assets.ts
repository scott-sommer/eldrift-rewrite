import { peekState } from '../../../../persistence/versioned-state';
import type { StatePort } from '../../../../persistence/versioned-state';
import { quantitySchema } from '../../../../persistence/quantities/schema';
import { reservationSchema } from '../../../../persistence/reservations/schema';
import { logisticsPool } from '../../../../capabilities/logistics/request';
import { stationTile } from '../../../../capabilities/mining/station';
import { observeStartupStation } from '../station-facts';
import { observeStartupWorker } from '../worker-facts';
import { startupClaimedPoolTotals } from '../stock';
import type { Position } from '../../../../capabilities/movement/step';
export function observePaidStationAssets(state: StatePort,room: Room,position: Position) {
  const claims = (peekState(state,'quantity-reservations/empire',quantitySchema)?.claims ?? []).filter(claim => claim.expiresAt > Game.time);
  const station = observeStartupStation(room,position,startupClaimedPoolTotals(claims,Game.time));
  if (!station) return undefined;
  const pools = station.status === 'ready' ? new Set([logisticsPool('stock',station.id,'energy'),logisticsPool('capacity',station.id)]) : new Set<string>();
  const quantityClaims = claims.filter(claim => claim.allocations.some(allocation => pools.has(allocation.pool)));
  const resource = 'mining-tile:'+stationTile(position);
  const stationClaim = peekState(state,'reservations/empire',reservationSchema)?.claims.find(claim => claim.resource === resource && claim.expiresAt > Game.time) ?? null;
  const container = room.lookForAt(LOOK_STRUCTURES,position.x,position.y).find((item): item is StructureContainer => item.structureType === 'container');
  const containerSpace = container ? { usedCapacity: container.store.getUsedCapacity(),freeEnergyCapacity: container.store.getFreeCapacity(RESOURCE_ENERGY) } : null;
  return { station: { ...position,facts: station },quantityClaims,stationClaim,containerSpace };
}
export function observeSourceWorkers(room: Room,source: Source) {
  return room.find(FIND_CREEPS).filter(creep => nearSource(creep,source) && creep.body.some(part => part.type === 'work' && part.hits > 0)).map(observeStartupWorker);
}
function nearSource(creep: Creep,source: Source): boolean {
  return creep.pos.roomName === source.pos.roomName && Math.max(Math.abs(creep.pos.x-source.pos.x),Math.abs(creep.pos.y-source.pos.y)) <= 1;
}
