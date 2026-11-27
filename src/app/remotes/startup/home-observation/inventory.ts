import { nativeUsedCapacity } from '../../../../adapters/screeps/store-usage';
import type { PaidHomeInventory,PaidHomeSourceObservation } from './model';
/** Shared physical stores occur once even if multiple source plans refer to them. */
export function joinPaidHomeInventories(home: readonly PaidHomeInventory[],sources: readonly PaidHomeSourceObservation[]): PaidHomeInventory[] {
  const inventory = new Map(home.map(fact => [fact.id,fact]));
  for (const source of sources) {
    const station = source.observation.station.facts; if (station.status !== 'ready') continue;
    const target = Game.getObjectById(station.id as Id<StructureContainer>); if (!target) throw new Error('Missing source inventory');
    const fact = observePaidHomeInventory(target),previous = inventory.get(fact.id);
    if (fact.energy !== station.energy || previous && JSON.stringify(previous) !== JSON.stringify(fact)) throw new Error('Conflicting source inventory');
    inventory.set(fact.id,fact);
  }
  return [...inventory.values()].sort((a,b) => a.id.localeCompare(b.id));
}
export function observePaidHomeInventory(target: AnyStoreStructure): PaidHomeInventory {
  return { id: target.id,room: target.pos.roomName,energy: target.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0,capacity: target.store.getCapacity(RESOURCE_ENERGY) ?? 0,
    usedCapacity: nativeUsedCapacity(target.store),freeEnergyCapacity: target.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0,active: target.isActive() };
}
