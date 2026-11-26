import { abandonUnknownTransfer } from './abandon-unknown-transfer';
import type { StatePort } from '../persistence/versioned-state';
import { peekState } from '../persistence/versioned-state';
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
  const journal = createTransferJournal(state, unit.id).peek();
  if (!journal?.attempt || (journal.acknowledged && journal.result?.status !== 'unknown')) return;
  const task = peekState(state, key, taskSchema(unit.name, definitions))?.queue[0];
  if (!task || task.kind !== 'haul' || !validHaulingPayload(task.payload) || task.payload.unitId !== unit.id) return;
  const binding = { home: task.payload.home, unit: unit.id, holder: unit.name, request: task.payload.request, scope: taskScope(unit.name, task.id) };
  const observation = observe(journal.attempt);
  settleHaulingTransfer(state, binding, observation, () => { createQuantityReservations(state).releaseScope(binding.scope); });
  abandonUnknownTransfer(state, binding, observation.tick, observation.cargo ?? null);
}

