import { logisticsPool } from '../../../capabilities/logistics/request';
import type { Position } from '../../../capabilities/movement/step';
import type { StartupStationFacts } from './facts-model';
/** Exact planned tile, rather than any container within source range. */
export function observeStartupStation(room: Room, station: Position, claims: ReadonlyMap<string,number>): StartupStationFacts | undefined {
  if (room.getTerrain().get(station.x,station.y) === TERRAIN_MASK_WALL) return undefined;
  const occupants = room.lookForAt(LOOK_STRUCTURES,station.x,station.y);
  if (occupants.some(item => !['container','road','rampart'].includes(item.structureType))) return undefined;
  if (occupants.some(item => item.structureType === 'rampart' && !item.my && !item.isPublic)) return undefined;
  const container = occupants.find((item): item is StructureContainer => item.structureType === 'container');
  const claimedEnergy = container ? claims.get(logisticsPool('stock',container.id,'energy')) ?? 0 : 0;
  if (container) return { claimedEnergy,availableEnergy: Math.max(0,container.store.energy-claimedEnergy),status: 'ready',id: container.id,remainingProgress: 0,energy: container.store.energy,capacity: container.store.getCapacity(RESOURCE_ENERGY),hits: container.hits,hitsMax: container.hitsMax,ticksToDecay: container.ticksToDecay };
  const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES,station.x,station.y);
  if (sites.some(site => !site.my || site.structureType !== 'container')) return undefined;
  const site = sites[0];
  if (site) return { status: 'building',id: site.id,remainingProgress: site.progressTotal-site.progress,progress: site.progress,total: site.progressTotal };
  return { status: 'missing',remainingProgress: CONSTRUCTION_COST.container };
}
