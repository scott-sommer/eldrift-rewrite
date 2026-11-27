import type { StatePort } from '../persistence/versioned-state';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import type { TransferAttempt,TransferObservation } from '../capabilities/logistics/confirmation';
import { settleHaulingTask } from './settle-hauling-task';
/** Preserve one-frame transfer evidence before optional actor work, even for an unvisited unit. */
export function settleHaulingFleet(state: StatePort, units: readonly { name: string; id: string }[], definitions: Readonly<Record<string,TaskDefinition>>,
  observe: (attempt: TransferAttempt) => TransferObservation): void {
  for (const unit of units) {
    const journal = createTransferJournal(state,unit.id).peek();
    if (!journal) continue;
    if (journal.acknowledged && journal.result?.status !== 'unknown') continue;
    settleHaulingTask(state,definitions,unit,observe);
  }
}
