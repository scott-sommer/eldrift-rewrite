import type { StatePort } from '../persistence/versioned-state';
import type { LabConfig } from '../config/labs';
import type { ProductionInventory } from '../capabilities/industry/production/model';
import { createQuantityReservations } from '../persistence/quantities/store';
import { logisticsPool } from '../capabilities/logistics/request';
import { labServiceOwner } from '../features/industry/lab-services';
interface PoolStore { id: string; store: StoreDefinition; floor: number }
/** Only stock the lab service can recover: owned banks, eligible labs and its admitted couriers. */
export function nativeProductionInventory(state: StatePort,room: Room,config: Readonly<LabConfig>): ProductionInventory {
  const claims = createQuantityReservations(state).list(Game.time), prefix = labServiceOwner(room.name,'');
  const holders = new Set(claims.filter(claim => claim.owner.startsWith(prefix)).map(claim => claim.holder));
  const excluded = claims.filter(claim => !claim.owner.startsWith(prefix)).flatMap(claim => claim.allocations);
  const reservations = new Map<string,number>();
  for (const item of excluded) reservations.set(item.pool,(reservations.get(item.pool) ?? 0)+item.amount);
  const banks = [room.storage,room.terminal].filter((store): store is StructureStorage | StructureTerminal => !!store?.my && store.isActive());
  const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB)
    .filter(lab => lab.isActive() && !config.labReservedIds.includes(lab.id));
  const couriers = room.find(FIND_MY_CREEPS).filter(creep => holders.has(creep.name));
  const objects: PoolStore[] = [...banks.map(bank => ({ id: bank.id,store: bank.store,floor: config.labSupplyReserve })),
    ...[...labs,...couriers].map(object => ({ id: object.id,store: object.store,floor: 0 }))];
  return summarize(objects,reservations);
}
function summarize(objects: readonly PoolStore[],claims: ReadonlyMap<string,number>): ProductionInventory {
  const total: Record<string,number> = {}, available: Record<string,number> = {}, reserveGap: Record<string,number> = {};
  for (const resource of RESOURCES_ALL) {
    total[resource] = 0; available[resource] = 0; reserveGap[resource] = 0;
    for (const object of objects) {
      const amount = object.store.getUsedCapacity(resource) ?? 0;
      total[resource] += amount;
      available[resource] += Math.max(0,amount-object.floor-(claims.get(logisticsPool('stock',object.id,resource)) ?? 0));
      reserveGap[resource] += Math.max(0,object.floor-amount);
    }
  }
  return { total,available,reserveGap };
}
