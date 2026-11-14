import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { workOwner } from '../../src/features/work/identity';
import { validWorkPayload } from '../../src/app/work-task';
import { taskSchema } from '../../src/persistence/tasks/schema';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps['build']!;
  creep.memory.population = { owner: workOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true, workerUpgradeReserve: 0, workerEnergyStorageReserve: 50000 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const task = openState(state, 'tasks/build', taskSchema('build', { work: { phases: ['work', 'collect'], validPayload: validWorkPayload } })).queue[0];
  const container = creep.room.find(FIND_STRUCTURES).find((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER)!;
  const memory = Memory as Memory & { workerCollection?: { phase: string; storage: number; container: number; energy: number; progress: number; sites: number }[] };
  (memory.workerCollection ??= []).push({ phase: task?.phase ?? 'none', storage: creep.room.storage!.store.energy,
    container: container.store.energy, energy: creep.store.energy, progress: creep.room.controller!.progress,
    sites: creep.room.find(FIND_MY_CONSTRUCTION_SITES).length });
}
