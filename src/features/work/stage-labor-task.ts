import { taskScope } from '../../persistence/tasks/scope';
import { createReservationCleanup } from '../../persistence/reservation-cleanup';
import { openState, peekState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { taskSchema } from '../../persistence/tasks/schema';
import type { TaskDefinition, TaskRecord } from '../../persistence/tasks/schema';
import { readLaborProposalSnapshot } from '../../capabilities/economy/startup/household/labor/proposal-reader';
import { laborTaskDefinition, validateStagedLaborTask } from './labor-task';
/** Claim no action/stock here; preserve other task heads and publish only fresh admitted evidence. */
export function createLaborTaskStaging(state: StatePort, otherDefinitions: Readonly<Record<string,TaskDefinition>> = {}) {
  const definitions = { ...otherDefinitions,'household-labor': laborTaskDefinition };
  function read(name: string) {
    const record = peekState(state,stateKey('tasks',name),taskSchema(name,definitions));
    for (const task of record?.queue ?? []) if (task.kind === 'household-labor') validateStagedLaborTask(task,name);
    return record;
  }
  function stage(value: unknown, tick: number, current: () => boolean) {
    const proposal = readLaborProposalSnapshot(value);
    if (tick !== proposal.observedAt || !current()) return 'stale' as const;
    const name = proposal.input.request.name, schema = taskSchema(name,definitions), key = stateKey('tasks',name);
    const task: TaskRecord = { id: 'household-labor:'+proposal.input.request.id,kind: 'household-labor',phase: 'await-birth',payload: { proposal },
      wakeAt: proposal.observedAt+proposal.input.birth.activeAt,retries: 0,expiresAt: proposal.observedAt+proposal.input.policy.horizon+1 };
    const previous = read(name);
    if (previous?.queue.length) return JSON.stringify(previous.queue) === JSON.stringify([task]) ? 'existing' as const : 'task-conflict' as const;
    if (![task.wakeAt,task.expiresAt].every(Number.isSafeInteger)) throw new Error('Labor task clock overflow');
    openState(state,key,schema); saveState(state,key,schema,{ unit: name,queue: [task] }); return 'staged' as const;
  }
  function cancel(name: string, request: string): boolean {
    const previous = read(name); if (!previous) return false;
    const index = previous.queue.findIndex(task => task.kind === 'household-labor' && task.id === 'household-labor:'+request);
    if (index < 0) return false;
    const task = previous.queue[index]!;
    createReservationCleanup(state).releaseScope(taskScope(name,task.id)); previous.queue.splice(index,1);
    const key = stateKey('tasks',name), schema = taskSchema(name,definitions);
    openState(state,key,schema); saveState(state,key,schema,previous); return true;
  }
  return { stage,read,cancel };
}
