import type { BoostJob, BoostUnit } from '../capabilities/industry/boosts/model';
import type { BoostLab } from '../capabilities/industry/boosts/supply';
import { boostScope, boostServiceOwner } from '../capabilities/industry/boosts/model';
import type { StatePort } from '../persistence/versioned-state';
import { createQuantityReservations } from '../persistence/quantities/store';
import { logisticsPool } from '../capabilities/logistics/request';
export function nativeBoostUnit(job: BoostJob): BoostUnit | null {
  const unit = Game.getObjectById(job.request.unit as Id<Creep>);
  if (!unit?.my || !Array.isArray(unit.body)) return null;
  return { id: unit.id,name: unit.name,owner: unit.memory.population?.owner ?? '',home: unit.memory.population?.home ?? '',spawning: unit.spawning,
    body: unit.body.map(part => ({ type: part.type,hits: part.hits,boost: bodyBoost(part.boost) })) };
}
export function nativeBoostLab(lab: StructureLab): BoostLab {
  return { id: lab.id,mineral: lab.mineralType,amount: lab.mineralType ? lab.store.getUsedCapacity(lab.mineralType) : 0,
    free: lab.mineralType ? lab.store.getFreeCapacity(lab.mineralType) : LAB_MINERAL_CAPACITY,energy: lab.store.getUsedCapacity(RESOURCE_ENERGY),energyFree: lab.store.getFreeCapacity(RESOURCE_ENERGY) };
}
export function boostLabBusy(state: StatePort,job: BoostJob,lab: StructureLab): boolean {
  return labStockBusy(state,lab,[boostScope(job.request),boostServiceOwner(job.request)]);
}
/** All stock/capacity owners participate, including admitted supply that may already carry cargo. */
export function labStockBusy(state: StatePort,lab: StructureLab,allowedOwners: readonly string[] = []): boolean {
  const pools = [logisticsPool('capacity',lab.id,'mineral'),logisticsPool('capacity',lab.id,'energy'),logisticsPool('stock',lab.id,'energy')];
  if (lab.mineralType) pools.push(logisticsPool('stock',lab.id,lab.mineralType));
  return createQuantityReservations(state).list(Game.time).filter(claim => !allowedOwners.includes(claim.owner))
    .some(claim => claim.allocations.some(item => pools.includes(item.pool)));
}

function bodyBoost(value: unknown): string | null { return value === undefined || value === null ? null : String(value); }
