import type { Outcome } from '../../core/execution/model';
import type { StatePort } from '../../persistence/versioned-state';
import type { TaskDefinition,TaskRecord } from '../../persistence/tasks/schema';
import { createLogisticsRequests } from '../../features/logistics/request-store';
import { taskScope } from '../task-runner';
import { remoteBankingTask } from './banking-task';
export interface RemoteBankingWorkPorts<Worker> {
  name(worker: Worker): string;
  homeReady(worker: Worker): boolean;
  atHome(worker: Worker): boolean;
  routeReady(worker: Worker): boolean;
  retire(worker: Worker,home: string,owner: string): Outcome;
  work(worker: Worker,task: Readonly<TaskRecord>): Outcome;
}
/** Home loss cancels through the request owner; travel and transfer stay in their platform adapters. */
export function createRemoteBankingWork<Worker>(state: StatePort,home: string,definition: TaskDefinition,ports: RemoteBankingWorkPorts<Worker>) {
  return { ...definition,handlers: (task: Readonly<TaskRecord>) => ({ work: (worker: Worker): Outcome => {
    if (!remoteBankingTask(task,home)) return { status: 'running' };
    if (!ports.homeReady(worker)) {
      createLogisticsRequests(state,home).cancel(task.payload.request.owner,task.payload.request.id);
      return { status: 'failed',reason: 'banking-home-lost' };
    }
    if (!ports.atHome(worker)) {
      ports.retire(worker,home,taskScope(ports.name(worker),task.id)); return { status: 'running' };
    }
    if (!ports.routeReady(worker)) return { status: 'running' };
    return ports.work(worker,task);
  } }) };
}
