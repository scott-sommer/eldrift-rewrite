import { peekState } from '../../../../persistence/versioned-state';
import type { StatePort } from '../../../../persistence/versioned-state';
import { taskSchema } from '../../../../persistence/tasks/schema';
import type { TaskDefinition } from '../../../../persistence/tasks/schema';
import { remoteBankingTask } from '../../banking-task';
import { validRemoteTaskPayload } from '../../task';
import type { ForecastMinerWorker } from './model';
/** Rebind saved tasks only to the same home, physical unit and source-demand identity. */
export function validateHomeMinerTasks(state: StatePort,home: string,worker: ForecastMinerWorker,demand: string,definitions: Readonly<Record<string,TaskDefinition>>): void {
  const tasks = peekState(state,'tasks/'+worker.name,taskSchema(worker.name,definitions));
  if (!tasks) throw new Error('Missing home mining actor task state');
  for (const task of tasks.queue) {
    if (task.kind === 'haul') {
      if (!remoteBankingTask(task,home) || task.payload.unitId !== worker.unit) throw new Error('Forecast miner banking task binding mismatch');
    } else if (!validRemoteTaskPayload(task.payload) || task.payload.home !== home || task.payload.token.id !== demand) throw new Error('Forecast miner source task binding mismatch');
  }
}
