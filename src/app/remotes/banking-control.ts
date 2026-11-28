import { stateKey } from '../../persistence/state-key';
import { peekState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { taskSchema } from '../../persistence/tasks/schema';
import type { TaskDefinition,TaskRecord } from '../../persistence/tasks/schema';
import { createTransferJournal } from '../../features/logistics/transfer-journal';
import { cancelTask } from '../cancel-task';
import { remoteBankingTask } from './banking-task';
export type RemoteBankingMode = 'service' | 'bank' | 'hold';
export interface RemoteBankingPorts<Worker> {
  identity(worker: Worker): { name: string; id: string };
  eligible(worker: Worker): boolean;
  cargo(worker: Worker): number;
  interior(worker: Worker): boolean;
  homeReady(worker: Worker): boolean;
  routeReady(worker: Worker): boolean;
  settle(worker: Worker,definitions: Readonly<Record<string,TaskDefinition>>): void;
  recover(worker: Worker,definitions: Readonly<Record<string,TaskDefinition>>): void;
}
/** Shared task ownership and interruption order; platform adapters own observation and effects. */
export function createRemoteBankingControl<Worker>(state: StatePort,home: string,ports: RemoteBankingPorts<Worker>) {
  function queue(worker: Worker,definitions: Readonly<Record<string,TaskDefinition>>): TaskRecord[] {
    const name = ports.identity(worker).name;
    return peekState(state,stateKey('tasks',name),taskSchema(name,definitions))?.queue ?? [];
  }
  function priorWork(worker: Worker,head: TaskRecord | undefined,definitions: Readonly<Record<string,TaskDefinition>>): RemoteBankingMode | undefined {
    if (!head || head.kind !== 'haul') return undefined;
    if (!remoteBankingTask(head,home)) return 'hold';
    ports.settle(worker,definitions); return 'bank';
  }
  function admission(worker: Worker,tasks: readonly TaskRecord[],interrupt: readonly string[]): RemoteBankingMode | undefined {
    if (unsettled(state,ports.identity(worker).id)) return 'hold';
    if (ports.cargo(worker) === 0 || !ports.interior(worker)) return 'service';
    if (!preemptible(tasks,interrupt)) return 'service';
    if (!ports.homeReady(worker) || !ports.routeReady(worker)) return 'hold';
    return undefined;
  }
  return { owns: (task: Readonly<TaskRecord>) => Boolean(remoteBankingTask(task,home)),
    prepare(worker: Worker,definitions: Readonly<Record<string,TaskDefinition>>,interrupt: readonly string[] = []): RemoteBankingMode {
      if (!ports.eligible(worker)) return 'hold';
      const tasks = queue(worker,definitions),mode = priorWork(worker,tasks[0],definitions) ?? admission(worker,tasks,interrupt);
      if (mode) return mode;
      if (tasks[0]) cancelTask(state,ports.identity(worker).name,tasks[0].id,definitions);
      if (queue(worker,definitions).length) return 'hold';
      ports.recover(worker,definitions);
      return queue(worker,definitions).length > 0 ? 'bank' : 'hold';
    },
  };
}
function unsettled(state: StatePort,unit: string): boolean {
  if (state.read(stateKey('logistics-attempts',unit)) === undefined) return false;
  const journal = createTransferJournal(state,unit).read();
  return !journal.acknowledged || journal.result?.status === 'unknown';
}
function preemptible(tasks: readonly TaskRecord[],kinds: readonly string[]): boolean {
  return tasks.length === 0 || tasks.length === 1 && kinds.includes(tasks[0]!.kind);
}
