import type { EnergyBuildSite,EnergyEcology } from '../../src/capabilities/resources/energy-inventory/model';
import { logisticsPool } from '../../src/capabilities/logistics/request';
export function constructionSite(position = { room: 'W0N1',x: 10,y: 10 },remaining = 5): EnergyBuildSite {
  const id = 'forecast:site:container';
  return { id: 'site',structureType: 'container',position,progress: 5000-remaining,progressTotal: 5000,completion: {
    store: { id,room: position.room,active: true,capacityPool: logisticsPool('capacity',id),energy: 0,usedCapacity: 0,freeEnergyCapacity: 2000,capacity: 2000 },
    health: { id,position,hits: 250000,hitsMax: 250000,repairable: true },
    container: { id,position,decay: { remaining: 100,interval: 99,amount: 5000 } },
  } };
}
export function constructionEcology(site = constructionSite()): EnergyEcology {
  return { sources: [],ground: [],containers: [],structures: [],sites: [site],decayDivisor: 1000 };
}
