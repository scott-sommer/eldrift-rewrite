import type { StatePort } from '../../persistence/versioned-state';
import { pendingLabReplans, requestLabReplans } from '../industry/lab-replan';
import { validateOperatorHome, validateOperatorHomes } from './room-transaction';
export function createLabMaintenanceOperator(state: StatePort,owns: (home: string) => boolean) {
  function requestReplans(homes: readonly string[]) {
    validateOperatorHomes(homes);
    if (homes.some(home => !owns(home))) throw new Error('Visible owned room is required');
    return { changed: requestLabReplans(state,homes),requested: [...homes].sort() };
  }
  return { requestReplans,
    requestReplan(home: string) { return requestReplans([home]); },
    replanStatus(home: string) { validateOperatorHome(home); return { home,pending: pendingLabReplans(state).includes(home) }; },
  };
}
