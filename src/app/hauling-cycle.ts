import type { Outcome } from '../core/execution/model';
import type { StatePort } from '../persistence/versioned-state';
import { createQuantityReservations } from '../persistence/quantities/store';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { createLogisticsRequests } from '../features/logistics/request-store';
import { reserveTransfer } from '../features/logistics/reserve-transfer';
import type { TransferAvailability } from '../features/logistics/reserve-transfer';
import { logisticsPool } from '../capabilities/logistics/request';
import type { LogisticsRequest } from '../capabilities/logistics/request';
import type { TransferAttempt, TransferObservation } from '../capabilities/logistics/confirmation';
import { settleHaulingTransfer } from './settle-hauling-transfer';
export interface HaulingBinding { home: string; unit: string; holder: string; scope: string; request: LogisticsRequest }
export interface HaulingView extends TransferAvailability { tick: number; cargo: number; freeCargo: number }
export interface HaulingPorts {
  observe(attempt: TransferAttempt): TransferObservation;
  execute(request: LogisticsRequest, phase: 'collect' | 'deliver', amount: number, attemptId: string, requestKey: string): Outcome;
}
/** One assigned request's work cycle; callers own task admission, endpoint observations and native dispatch. */
export function runHauling(state: StatePort, binding: HaulingBinding, view: HaulingView, ports: HaulingPorts): Outcome {
  if (![view.tick, view.cargo, view.freeCargo].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid hauling view');
  const journal = createTransferJournal(state, binding.unit);
  const previous = journal.read();
  if (previous.attempt && !previous.acknowledged) {
    const settled = settleHaulingTransfer(state, binding, ports.observe(previous.attempt), (_attempt, result) => {
      if (result.status === 'observed') refreshCargoBooking(state, binding, view);
    });
    if (settled?.status === 'waiting') return wait(view.tick, 'transfer-pending');
  }
  if (journal.read().result?.status === 'unknown') return wait(view.tick, 'transfer-evidence-lost');
  const request = pending(state, binding, view.tick);
  if (!request) return finish(state, binding, view);
  const phase = view.cargo > 0 ? 'deliver' : 'collect';
  const amount = book(state, binding, request, view, phase);
  if (amount === 0) return wait(view.tick, 'logistics-capacity-unavailable');
  const requestKey = logisticsPool('request-binding', binding.home, request.owner, request.id);
  return ports.execute(request, phase, amount, logisticsPool('attempt', binding.unit, binding.scope, String(view.tick)), requestKey);
}
function pending(state: StatePort, binding: HaulingBinding, tick: number): LogisticsRequest | undefined {
  return createLogisticsRequests(state, binding.home).pending(tick)
    .find(request => request.owner === binding.request.owner && request.id === binding.request.id);
}
function refreshCargoBooking(state: StatePort, binding: HaulingBinding, view: HaulingView): void {
  const request = pending(state, binding, view.tick);
  if (view.cargo === 0 || !request) createQuantityReservations(state).releaseScope(binding.scope);
  else book(state, binding, request, view, 'deliver');
}
function book(state: StatePort, binding: HaulingBinding, request: LogisticsRequest, view: HaulingView, phase: 'collect' | 'deliver'): number {
  return reserveTransfer(state, request, { holder: binding.holder, scope: binding.scope, phase,
    maximum: phase === 'collect' ? view.freeCargo : view.cargo, expiresAt: view.tick + 2 }, view, view.tick);
}
function finish(state: StatePort, binding: HaulingBinding, view: HaulingView): Outcome {
  createQuantityReservations(state).releaseScope(binding.scope);
  return view.cargo > 0 ? wait(view.tick, 'orphaned-hauling-cargo') : { status: 'done' };
}
function wait(tick: number, reason: string): Outcome { return { status: 'blocked', reason, retryAt: tick + 1 }; }
