import { logisticsPool } from '../capabilities/logistics/request';
import type { StatePort } from '../persistence/versioned-state';
import type { LogisticsRequest } from '../capabilities/logistics/request';
import type { TransferAttempt, TransferConfirmation, TransferObservation } from '../capabilities/logistics/confirmation';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { createLogisticsRequests } from '../features/logistics/request-store';
export interface HaulingSettlement {
  home: string;
  unit: string;
  request: LogisticsRequest;
}
/** Reconciliation must be idempotent: receipt and reservation writes can be interrupted independently. */
export function settleHaulingTransfer(state: StatePort, binding: HaulingSettlement, observation: TransferObservation,
  reconcile: (attempt: TransferAttempt, result: Exclude<TransferConfirmation, { status: 'waiting' }>) => void): TransferConfirmation | null {
  const journal = createTransferJournal(state, binding.unit);
  const previous = journal.read();
  if (!previous.attempt || previous.acknowledged) return null;
  validateHaulingBinding(previous.attempt, binding);
  const result = journal.settle(observation);
  if (!result || result.status === 'waiting') return result;
  if (result.status === 'observed' && result.amount > 0 && previous.attempt.kind === 'transfer') {
    createLogisticsRequests(state, binding.home).confirm(binding.request.owner, binding.request.id,
      { id: previous.attempt.id, amount: result.amount }, observation.tick, previous.attempt.tick);
  }
  reconcile(previous.attempt, result);
  journal.acknowledge(previous.attempt.id);
  return result;
}
export function validateHaulingBinding(attempt: TransferAttempt, binding: HaulingSettlement): void {
  const target = attempt.kind === 'transfer' ? binding.request.sink : binding.request.source;
  if (attempt.requestKey !== logisticsPool('request-binding', binding.home, binding.request.owner, binding.request.id)) throw new Error('Hauling request binding mismatch');
  if (attempt.unit !== binding.unit || attempt.target !== target || attempt.resource !== binding.request.resource) {
    throw new Error('Hauling attempt does not match request');
  }
}


