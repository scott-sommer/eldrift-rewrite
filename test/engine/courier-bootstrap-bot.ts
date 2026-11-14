import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, energyRequestsEnabled: true, courierSpawningEnabled: true, courierBodyBudget: 100 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = Game.rooms['W0N1']!;
  const structures = room.find(FIND_STRUCTURES);
  const source = structures.find((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER)!;
  const sink = structures.find((item): item is StructureExtension => item.structureType === STRUCTURE_EXTENSION)!;
  const memory = Memory as Memory & { courierBootstrap?: { workers: number; source: number; delivered: number } };
  memory.courierBootstrap = { workers: Object.keys(Game.creeps).length, source: source.store.energy, delivered: sink.store.energy };
}
