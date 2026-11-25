import { checkpointTask } from './task-checkpoint';
import { taskScope } from '../persistence/tasks/scope';
import { execute } from '../core/execution/execute';
import type { Handlers } from '../core/execution/model';
import { openState, saveState } from '../persistence/versioned-state';
import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { taskSchema } from '../persistence/tasks/schema';
import type { TaskDefinition, TaskRecord } from '../persistence/tasks/schema';
import { createReservationCleanup } from '../persistence/reservation-cleanup';
export type TaskCheckpoint = (update: Pick<TaskRecord,'phase' | 'payload'>) => void;
export interface TaskBehavior<Context> extends TaskDefinition {
  handlers(task: Readonly<TaskRecord>, checkpoint?: TaskCheckpoint): Handlers<Context>;
}
export { taskScope } from '../persistence/tasks/scope';
export function createTaskRunner<Context>(port: StatePort, behaviors: Readonly<Record<string, TaskBehavior<Context>>>, clock: () => number,
  definitions: Readonly<Record<string, TaskDefinition>> = behaviors) {
  let lastTick: number | undefined;
  const visited = new Set<string>();
  return (unit: string, context: Context) => {
    const tick = clock();
    if (lastTick !== tick) { visited.clear(); lastTick = tick; }
    if (visited.has(unit)) return undefined;
    visited.add(unit);
    const schema = taskSchema(unit, definitions);
    const key = stateKey('tasks', unit);
    const state = openState(port, key, schema);
    const task = state.queue[0];
    if (!task || !Object.hasOwn(behaviors, task.kind)) return undefined;
    const checkpoint: TaskCheckpoint = update => { state.queue = checkpointTask(port,key,schema,task,update).queue; };
    const result = execute(task, behaviors[task.kind]!.handlers(task,checkpoint), context, tick);
    if (result.outcome.status === 'done' || result.outcome.status === 'failed') {
      createReservationCleanup(port).releaseScope(taskScope(unit, task.id));
      state.queue.shift();
    } else {
      state.queue[0] = { ...task, ...result.state };
    }
    saveState(port, key, schema, state);
    return result.outcome;
  };
}

