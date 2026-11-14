import { loop as botLoop } from '../../src/main';
import { createTaskRunner, taskScope } from '../../src/app/task-runner';
import type { TaskBehavior } from '../../src/app/task-runner';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { harvestStep } from '../../src/capabilities/harvesting/step';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { createReservations } from '../../src/persistence/reservations/store';
const port = createMemoryPort(() => Memory);
const arbiter = createActionArbiter(() => Game.time);
const behaviors: Record<string, TaskBehavior<Creep>> = {
  collect: { phases: ['harvest'], validPayload: value => typeof value === 'string', handlers: task => ({ harvest: creep => {
    const source = Game.getObjectById(task.payload as Id<Source>);
    return harvestStep({ tick: Game.time, stored: creep.store.energy, goal: 2, target: source ? 'visible' : 'missing', inRange: !!source && creep.pos.isNearTo(source), available: source?.energy ?? 0, retryAt: Game.time + 1 }, {
      approach: () => ({ status: 'failed', reason: 'fixture-out-of-range' }),
      harvest: () => createCreepActions(creep, task.id, arbiter).harvest(source!),
      rejected: code => ({ status: 'failed', reason: String(code) }),
    });
  } }) },
};
const run = createTaskRunner(port, behaviors, () => Game.time);
export function loop() {
  botLoop();
  const evidence = Memory as Memory & { taskEvidence?: string[] };
  const creep = Game.creeps['action-worker']!;
  if (!evidence.taskEvidence) {
    evidence.taskEvidence = [];
    const schema = taskSchema(creep.name, behaviors);
    const state = openState(port, 'tasks/action-worker', schema);
    state.queue.push({ id: 'collect-one', kind: 'collect', phase: 'harvest', payload: creep.pos.findClosestByRange(FIND_SOURCES)!.id, retries: 0, wakeAt: 0, expiresAt: Game.time + 10 });
    saveState(port, 'tasks/action-worker', schema, state);
    createReservations(port).acquire({ resource: 'source-slot', holder: creep.name, scope: taskScope(creep.name, 'collect-one'), expiresAt: Game.time + 10 }, Game.time);
  }
  evidence.taskEvidence.push(run(creep.name, creep)?.status ?? 'idle');
}
