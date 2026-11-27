import type { StatePort } from '../../../persistence/versioned-state';
import type { TaskDefinition } from '../../../persistence/tasks/schema';
import { settleHaulingFleet } from '../../settle-hauling-fleet';
import { observeTransfer } from '../../../adapters/screeps/transfer-observation';
/** Native event observations feed the same before-work settlement owner as private forecasts. */
export function settleRemoteFleetTransfers(state: StatePort, creeps: readonly Creep[], definitions: Readonly<Record<string,TaskDefinition>>): void {
  settleHaulingFleet(state,creeps,definitions,observeTransfer);
}
