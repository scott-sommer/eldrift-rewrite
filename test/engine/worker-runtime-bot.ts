import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { workOwner } from '../../src/features/work/identity';
import { validWorkPayload } from '../../src/app/work-task';
import type { WorkTaskPayload } from '../../src/app/work-task';
import { taskSchema } from '../../src/persistence/tasks/schema';
export function loop() {
  const memory = Memory as Memory & { workerRuntime?: { kind: string; id: string; sites: number; hits: number; progress: number; energy: number }[] };
  const evidence = memory.workerRuntime ??= [];
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps['build']!;
  creep.memory.population = { owner: workOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: evidence.length !== 4 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const task = openState(state, 'tasks/build', taskSchema('build', { work: { phases: ['work'], validPayload: validWorkPayload } })).queue[0];
  const road = creep.room.find(FIND_STRUCTURES).find(item => item.structureType === STRUCTURE_ROAD && item.pos.x === 20)!;
  evidence.push({ kind: task ? (task.payload as WorkTaskPayload).order.kind : 'none', id: task?.id ?? '',
    sites: creep.room.find(FIND_MY_CONSTRUCTION_SITES).length, hits: road.hits, progress: creep.room.controller!.progress, energy: creep.store.energy });
}
