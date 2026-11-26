import type { StatePort } from '../../../persistence/versioned-state';
import type { TaskDefinition } from '../../../persistence/tasks/schema';
import { createTransferJournal } from '../../../features/logistics/transfer-journal';
import { settleHaulingTask } from '../../settle-hauling-task';
import { observeTransfer } from '../../../adapters/screeps/transfer-observation';
/** Prior-tick liabilities precede optional actor service: delayed observation must not turn ordinary delivery into uncertainty. */
export function settleRemoteFleetTransfers(state: StatePort, creeps: readonly Creep[], definitions: Readonly<Record<string,TaskDefinition>>): void {
  for (const creep of creeps) {
    const journal = createTransferJournal(state,creep.id).peek();
    if (!journal) continue;
    if (journal.acknowledged && journal.result?.status !== 'unknown') continue;
    settleHaulingTask(state,definitions,creep,observeTransfer);
  }
}
