import { movementPosition } from '../../../../adapters/screeps/movement-traffic';
import { validateEnergyEcology } from '../../../../capabilities/resources/energy-inventory/ecology';
import type { EnergyEcology } from '../../../../capabilities/resources/energy-inventory/model';
import { observePaidHomeInventory } from './inventory';
import type { PaidHomeInventory,PaidHomeSourceObservation } from './model';
import type { StartupWorkerFacts } from '../facts-model';
/** Current visible physical facts only; natural stock and ground energy never become bank cash. */
export function observePaidHomeEcology(home: string,sources: readonly PaidHomeSourceObservation[],workers: readonly StartupWorkerFacts[],
  inventories: readonly PaidHomeInventory[],guard: () => boolean) {
  const names = [...new Set([home,...sources.map(source => source.plan.room),...workers.map(worker => worker.position.room)])].sort();
  if (names.length > 16) throw new Error('Home ecology room bound exceeded');
  const ecology: EnergyEcology = { sources: [],ground: [],containers: [],structures: [],decayDivisor: ENERGY_DECAY };
  const stores = new Map(inventories.map(store => [store.id,store]));
  for (const name of names) {
    if (!guard()) throw new Error('Home ecology budget');
    const room = Game.rooms[name]; if (!room) throw new Error('Missing visible home ecology room');
    observeRoomEcology(room,ecology,stores);
  }
  const joined = [...stores.values()].sort((a,b) => a.id.localeCompare(b.id));
  if (joined.length+workers.length > 256) throw new Error('Home ecology inventory bound exceeded');
  validateEnergyEcology(ecology,joined);
  return { ecology,inventories: joined };
}
function observeRoomEcology(room: Room,ecology: EnergyEcology,stores: Map<string,PaidHomeInventory>): void {
  for (const source of room.find(FIND_SOURCES)) observeSource(source,ecology);
  for (const resource of room.find(FIND_DROPPED_RESOURCES)) {
    if (resource.resourceType === RESOURCE_ENERGY && resource.amount > 0) ecology.ground.push({ position: movementPosition(resource.pos),energy: resource.amount });
  }
  for (const structure of room.find(FIND_STRUCTURES)) {
    observeRepairTarget(structure,ecology);
    if (structure.structureType === STRUCTURE_CONTAINER && structure.hits > 0) observeContainer(structure,room,ecology,stores);
  }
}
function observeContainer(container: StructureContainer,room: Room,ecology: EnergyEcology,stores: Map<string,PaidHomeInventory>): void {
  const current = observePaidHomeInventory(container),previous = stores.get(current.id);
  if (previous && JSON.stringify(previous) !== JSON.stringify(current)) throw new Error('Conflicting home ecology container');
  stores.set(current.id,current); ecology.containers.push({ id: container.id,position: movementPosition(container.pos),
    decay: { remaining: Math.max(1,container.ticksToDecay ?? 1),amount: CONTAINER_DECAY,interval: (room.controller && room.controller.level > 0 ? CONTAINER_DECAY_TIME_OWNED : CONTAINER_DECAY_TIME)-1 } });
}

function observeSource(source: Source,ecology: EnergyEcology): void {
  if (source.effects?.length) throw new Error('Source power effects require a qualified physical model');
  ecology.sources.push({ id: source.id,position: movementPosition(source.pos),energy: source.energy,capacity: source.energyCapacity,
    regenerationIn: source.ticksToRegeneration ?? null,regenerationTicks: ENERGY_REGEN_TIME });
}

function observeRepairTarget(structure: AnyStructure,ecology: EnergyEcology): void {
  if (!('hits' in structure) || !('hitsMax' in structure) || typeof structure.hits !== 'number' || typeof structure.hitsMax !== 'number' || structure.hitsMax < 1) return;
  const costs = CONSTRUCTION_COST as Partial<Record<StructureConstant,number>>;
  ecology.structures!.push({ id: structure.id,position: movementPosition(structure.pos),hits: structure.hits,hitsMax: structure.hitsMax,repairable: !!costs[structure.structureType] });
}
