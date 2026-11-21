import { specialistBoostLabIds } from './native-specialist-labs';
import { nativeBoostRoleAccess } from './native-boost-role-access';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { spendBoostBudget } from '../features/industry/boosts/funding';
import type { MutableBoostBudget, LocalBoostKit } from '../features/industry/boosts/funding';
import { createQuantityReservations } from '../persistence/quantities/store';
import type { QuantityAllocation } from '../persistence/quantities/schema';
import { logisticsPool } from '../capabilities/logistics/request';
import { promisedNativeBoosts } from './native-worker-boost-promises';
interface StockObject { id: string; store: StoreDefinition; bank: boolean }
const boostClaim = (owner: string) => owner.startsWith('boost:') || owner.startsWith('industry-boost:');
function claimed(claims: readonly QuantityAllocation[],id: string,resource: string): number {
  return claims.filter(item => item.pool === logisticsPool('stock',id,resource)).reduce((sum,item) => sum+item.amount,0);
}
function bankStock(objects: readonly StockObject[],claims: readonly QuantityAllocation[],config: Readonly<RuntimeConfig>): Record<string,number> {
  const total: Record<string,number> = {};
  for (const resource of RESOURCES_ALL) for (const object of objects) {
    const floor = object.bank ? (resource === RESOURCE_ENERGY ? config.storageEnergyReserve : config.labSupplyReserve) : 0;
    total[resource] = (total[resource] ?? 0)+Math.max(0,(object.store.getUsedCapacity(resource) ?? 0)-floor-claimed(claims,object.id,resource));
  }
  return total;
}
/** Match the executor's largest matching-lab preference; never pool inaccessible energy from other labs. */
function localKits(room: Room,claims: readonly QuantityAllocation[],preferredLab: string | undefined,allows: (lab: string,resource: string) => boolean): Record<string,LocalBoostKit> {
  const kits: Record<string,LocalBoostKit> = {};
  const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB && item.isActive() && (preferredLab === undefined || item.id === preferredLab));
  labs.sort((a,b) => b.mineralAmount-a.mineralAmount || a.id.localeCompare(b.id));
  for (const lab of labs) {
    if (!lab.mineralType || kits[lab.mineralType] || !allows(lab.id,lab.mineralType)) continue;
    const blocked = [logisticsPool('capacity',lab.id,'mineral'),logisticsPool('capacity',lab.id,'energy'),logisticsPool('stock',lab.id,lab.mineralType),logisticsPool('stock',lab.id,RESOURCE_ENERGY)];
    if (claims.some(item => blocked.includes(item.pool))) continue;
    kits[lab.mineralType] = { mineral: Math.max(0,lab.mineralAmount-claimed(claims,lab.id,lab.mineralType)),energy: Math.max(0,lab.store.energy-claimed(claims,lab.id,RESOURCE_ENERGY)) };
  }
  return kits;
}
export function nativeBoostBudget(state: StatePort,room: Room,config: Readonly<RuntimeConfig>,preferredLab?: string): MutableBoostBudget {
  const claims = createQuantityReservations(state).list(Game.time);
  const foreign = claims.filter(claim => !boostClaim(claim.owner)).flatMap(claim => claim.allocations);
  const holders = new Set(claims.filter(claim => claim.owner.startsWith('industry-boost:')).map(claim => claim.holder));
  const banks = [room.storage,room.terminal].filter((bank): bank is StructureStorage | StructureTerminal => !!bank?.my && bank.isActive());
  const cargo = room.find(FIND_MY_CREEPS).filter(creep => holders.has(creep.name));
  const objects: StockObject[] = [...banks.map(bank => ({ id: bank.id,store: bank.store,bank: true })),...cargo.map(item => ({ id: item.id,store: item.store,bank: false }))];
  const total = bankStock(objects,foreign,config), access = nativeBoostRoleAccess(state,room.name,config.labBoostRoles);
  const ids = room.find(FIND_MY_STRUCTURES).filter(item => item.structureType === STRUCTURE_LAB && item.isActive() && (preferredLab === undefined || item.id === preferredLab)).map(item => item.id);
  const excluded = specialistBoostLabIds(room.name,config), resources = access.resources(ids.filter(id => !excluded.includes(id)));
  const budget: MutableBoostBudget = { minerals: total,energy: total[RESOURCE_ENERGY] ?? 0,local: localKits(room,foreign,preferredLab,(id,resource) => !excluded.includes(id) && access.allows(id,resource)),...(resources ? { resources } : {}) };
  for (const steps of promisedNativeBoosts(state,room.name)) spendBoostBudget(budget,steps,{ mineral: LAB_BOOST_MINERAL,energy: LAB_BOOST_ENERGY });
  return budget;
}
