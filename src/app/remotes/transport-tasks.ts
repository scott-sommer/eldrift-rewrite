import type { StatePort } from '../../persistence/versioned-state';
import { peekState } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { taskSchema } from '../../persistence/tasks/schema';
import type { TaskDefinition, TaskRecord } from '../../persistence/tasks/schema';
import { validHaulingPayload } from '../hauling-task';
import type { HaulingTaskPayload } from '../hauling-task';
import { createLogisticsRequests } from '../../features/logistics/request-store';
import { createTransferJournal } from '../../features/logistics/transfer-journal';
import { cancelTask } from '../cancel-task';
export function remoteTransportTasks(state: StatePort, definitions: Readonly<Record<string,TaskDefinition>>, home: string) {
  function head(unit: string): TaskRecord | undefined {
    return peekState(state,stateKey('tasks',unit),taskSchema(unit,definitions))?.queue[0];
  }
  function payload(task: TaskRecord | undefined): HaulingTaskPayload | undefined {
    return task?.kind === 'haul' && validHaulingPayload(task.payload) ? task.payload : undefined;
  }
  return { head,payload,
    pending(unit: string): boolean {
      if (state.read(stateKey('logistics-attempts',unit)) === undefined) return false;
      return !createTransferJournal(state,unit).read().acknowledged;
    },
    cancel(unit: string, task: TaskRecord): void {
      const value = payload(task);
      if (value) createLogisticsRequests(state,home).cancel(value.request.owner,value.request.id);
      cancelTask(state,unit,task.id,definitions);
    },
    close(task: TaskRecord): void {
      const value = payload(task);
      if (value) createLogisticsRequests(state,home).cancel(value.request.owner,value.request.id);
    },
  };
}
