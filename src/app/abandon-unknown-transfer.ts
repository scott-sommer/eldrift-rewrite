import type { StatePort } from '../persistence/versioned-state';
import type { HaulingBinding } from './hauling-cycle';
import { validateHaulingBinding } from './settle-hauling-transfer';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { createLogisticsRequests } from '../features/logistics/request-store';
import { createQuantityReservations } from '../persistence/quantities/store';
import { recordUncertainTransfer } from '../features/logistics/uncertainty';
/** Archive uncertainty before cancelling/releasing/resetting. No receipt is inferred from current cargo. */
export function abandonUnknownTransfer(state: StatePort, binding: HaulingBinding, tick: number, cargo: number | null): boolean {
  const journal = createTransferJournal(state, binding.unit);
  const previous = journal.read();
  if (!previous.attempt || previous.result?.status !== 'unknown' || !previous.acknowledged) return false;
  validateHaulingBinding(previous.attempt, binding);
  recordUncertainTransfer(state, { attempt: previous.attempt, request: binding.request,
    home: binding.home, scope: binding.scope, tick, cargo });
  createLogisticsRequests(state, binding.home).cancel(binding.request.owner, binding.request.id);
  createQuantityReservations(state).releaseScope(binding.scope);
  journal.retireUnknown(previous.attempt.id);
  return true;
}
