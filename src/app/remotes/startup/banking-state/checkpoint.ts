import { peekState } from '../../../../persistence/versioned-state';
import type { StatePort } from '../../../../persistence/versioned-state';
import { taskSchema } from '../../../../persistence/tasks/schema';
import { createTransferJournal } from '../../../../features/logistics/transfer-journal';
import { remoteBankingTask } from '../../banking-task';
import { validateHaulingBinding } from '../../../settle-hauling-transfer';
import { homeMinerDefinitions } from '../hauling-state/world/control';
import { validatePendingInventoryUnit } from '../hauling-state/world/transfer-state';
import type { EnergyEffect } from '../../../../capabilities/resources/energy-inventory/model';
import type { HomeHaulingInput } from '../hauling-state/world/model';
/** Physical bank transfers retain their exact task/request/journal witness across a closed-frame save. */
export function validateHomeBankingContinuation(input: HomeHaulingInput,effects: readonly EnergyEffect[],state: StatePort,nextTick: number): void {
  for (const miner of input.sources.flatMap(source => source.miners)) {
    const unit = miner.observation.unit,name = miner.paid.request;
    const task = peekState(state,'tasks/'+name,taskSchema(name,homeMinerDefinitions))?.queue[0],journal = createTransferJournal(state,unit).peek();
    if (task?.kind !== 'haul') {
      if (journal?.attempt && !journal.acknowledged) throw new Error('Missing home checkpoint banking task');
      continue;
    }
    if (!remoteBankingTask(task,input.home) || task.payload.unitId !== unit) throw new Error('Home checkpoint banking binding mismatch');
    validatePendingInventoryUnit(effects,state,unit,nextTick);
    if (journal?.attempt && !journal.acknowledged) validateHaulingBinding(journal.attempt,{ home: input.home,unit,request: task.payload.request });
  }
}
