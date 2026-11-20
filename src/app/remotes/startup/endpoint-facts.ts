import { movementPosition } from '../../../adapters/screeps/movement-traffic';
import { logisticsPool } from '../../../capabilities/logistics/request';
/** One actual bank endpoint. Other resources share its capacity and active incoming claims remain liabilities. */
export function observeStartupEndpoint(id: string, home: Room, claims: ReadonlyMap<string,number>) {
  const target = Game.getObjectById(id as Id<StructureStorage | StructureTerminal | StructureContainer>);
  if (!target || target.pos.roomName !== home.name || !['storage','terminal','container'].includes(target.structureType)) return undefined;
  if (target.structureType !== 'container' && !target.my) return undefined;
  if (!target.isActive()) return undefined;
  const freeCapacity = target.store.getFreeCapacity(RESOURCE_ENERGY), claimedCapacity = claims.get(logisticsPool('capacity',target.id)) ?? 0;
  return { id: target.id,position: movementPosition(target.pos),type: target.structureType,energy: target.store.energy,capacity: target.store.getCapacity(RESOURCE_ENERGY),freeCapacity,claimedCapacity,availableCapacity: Math.max(0,freeCapacity-claimedCapacity) };
}
