import type { StatePort } from '../persistence/versioned-state';
import { openState } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { taskSchema } from '../persistence/tasks/schema';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { createQuantityReservations } from '../persistence/quantities/store';
import type { TransferAttempt, TransferObservation } from '../capabilities/logistics/confirmation';
import { validHaulingPayload } from './hauling-task';
import { taskScope } from './task-runner';
import { settleHaulingTransfer } from './settle-hauling-transfer';
/** Settle previous-tick effects before the executor may discard an expired task. */
export function settleHaulingTask(state: StatePort, definitions: Readonly<Record<string, TaskDefinition>>,
  unit: { name: string; id: string }, observe: (attempt: TransferAttempt) => TransferObservation): void {
  const key = stateKey('tasks', unit.name);
  if (state.read(key) === undefined || state.read(stateKey('logistics-attempts', unit.id)) === undefined) return;
  const task = openState(state, key, taskSchema(unit.name, definitions)).queue[0];
  if (!task || task.kind !== 'haul' || !validHaulingPayload(task.payload) || task.payload.unitId !== unit.id) return;
  const journal = createTransferJournal(state, unit.id).read();
  if (!journal.attempt || journal.acknowledged) return;
  settleHaulingTransfer(state, { home: task.payload.home, unit: unit.id, request: task.payload.request },
    observe(journal.attempt), () => { createQuantityReservations(state).releaseScope(taskScope(unit.name, task.id)); });
}
