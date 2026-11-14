import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true, workerSpawningEnabled: true, workerBuilderTarget: 1, workerBodyBudget: 250 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = Game.rooms['W0N1']!;
  const units = Object.values(Game.creeps);
  const container = room.find(FIND_STRUCTURES).find((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER)!;
  const memory = Memory as Memory & { workerPopulation?: { names: string[]; ready: number; energy: number; progress: number; sites: number; owners: string[] }[] };
  (memory.workerPopulation ??= []).push({ names: units.map(unit => unit.name), ready: units.filter(unit => !unit.spawning).length,
    energy: container.store.energy, progress: room.controller!.progress, sites: room.find(FIND_MY_CONSTRUCTION_SITES).length,
    owners: units.map(unit => unit.memory.population?.owner ?? '') });
}
