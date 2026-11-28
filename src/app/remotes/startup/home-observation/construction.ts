import { movementPosition } from '../../../../adapters/screeps/movement-traffic';
import { framedIdentity } from '../../../../core/framed-identity';
import { logisticsPool } from '../../../../capabilities/logistics/request';
import type { EnergyBuildSite,EnergyContainerBirth } from '../../../../capabilities/resources/energy-inventory/model';
/** Sites are physical facts; permission and future blockers must be assessed by the actor each frame. */
export function observePaidHomeSites(room: Room): EnergyBuildSite[] {
  return room.find(FIND_CONSTRUCTION_SITES).map(site => ({ id: site.id,structureType: site.structureType,position: movementPosition(site.pos),
    progress: site.progress,progressTotal: site.progressTotal,completion: site.structureType === STRUCTURE_CONTAINER ? containerBirth(site,room) : null }));
}
function containerBirth(site: ConstructionSite,room: Room): EnergyContainerBirth {
  const id = 'forecast:'+framedIdentity(['construction',site.id,'container']),position = movementPosition(site.pos);
  return {
    store: { id,room: position.room,active: true,capacityPool: logisticsPool('capacity',id),energy: 0,usedCapacity: 0,freeEnergyCapacity: CONTAINER_CAPACITY,capacity: CONTAINER_CAPACITY },
    health: { id,position,hits: CONTAINER_HITS,hitsMax: CONTAINER_HITS,repairable: true },
    container: { id,position,decay: { remaining: CONTAINER_DECAY_TIME,interval: (room.controller && room.controller.level > 0 ? CONTAINER_DECAY_TIME_OWNED : CONTAINER_DECAY_TIME)-1,amount: CONTAINER_DECAY } },
  };
}
