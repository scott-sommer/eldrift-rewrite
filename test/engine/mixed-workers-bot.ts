import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { workOwner } from '../../src/features/work/identity';
import { validWorkPayload } from '../../src/app/work-task';
import type { WorkTaskPayload } from '../../src/app/work-task';
import { taskSchema } from '../../src/persistence/tasks/schema';
import type { WorkerMode } from '../../src/features/work/policy';
const assignments: [string, WorkerMode][] = [['build', 'builder'], ['repair', 'fortifier'], ['upgrade', 'upgrader']];
export function loop() {
  const state = createMemoryPort(() => Memory);
  for (const [name, mode] of assignments) Game.creeps[name]!.memory.population = { home: 'W0N1', owner: workOwner('W0N1', mode) };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true, workerMode: 'builder' };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const kinds = assignments.map(([name]) => {
    const task = openState(state, 'tasks/' + name, taskSchema(name, { work: { phases: ['work', 'collect'], validPayload: validWorkPayload } })).queue[0];
    return task ? (task.payload as WorkTaskPayload).order.kind : 'none';
  });
  const memory = Memory as Memory & { mixedWorkers?: { kinds: string[]; progress: number }[] };
  (memory.mixedWorkers ??= []).push({ kinds, progress: Game.rooms['W0N1']!.controller!.progress });
}
