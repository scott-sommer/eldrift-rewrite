import { abandonUnknownTransfer } from './abandon-unknown-transfer';
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
export interface HaulingView extends TransferAvailability { tick: number; cargo: number; freeCargo: number; sinkRoom?: string; sinkStatus?: 'visible' | 'missing' | 'unseen' }
export interface HaulingPorts {
  observe(attempt: TransferAttempt): TransferObservation;
  execute(request: LogisticsRequest, phase: 'collect' | 'deliver', amount: number, attemptId: string, requestKey: string): Outcome;
}
/** One assigned request's work cycle; callers own task admission, endpoint observations and native dispatch. */
export function runHauling(state: StatePort, binding: HaulingBinding, view: HaulingView, ports: HaulingPorts): Outcome {
  if (![view.tick, view.cargo, view.freeCargo].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid hauling view');
  const liability = settlePending(state,binding,view,ports); if (liability) return liability;
  if (unusableDestination(view)) {
    createLogisticsRequests(state, binding.home).cancel(binding.request.owner, binding.request.id);
    return finish(state, binding, view);
  }
  const request = pending(state, binding, view.tick);
  if (!request || (view.cargo === 0 && view.sourceStock === 0)) return finish(state, binding, view);
  const phase = view.cargo > 0 ? 'deliver' : 'collect';
  const amount = book(state, binding, request, view, phase);
  if (amount === 0) return unavailable(state, binding, view);
  const requestKey = logisticsPool('request-binding', binding.home, request.owner, request.id);
  return ports.execute(request, phase, amount, logisticsPool('attempt', binding.unit, binding.scope, String(view.tick)), requestKey);
}
function pending(state: StatePort, binding: HaulingBinding, tick: number): LogisticsRequest | undefined {
  return createLogisticsRequests(state,binding.home).findPending(binding.request.owner,binding.request.id,tick);
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
  return view.cargo > 0 ? { status: 'failed', reason: 'orphaned-hauling-cargo' } : { status: 'done' };
}
function wait(tick: number, reason: string): Outcome { return { status: 'blocked', reason, retryAt: tick + 1 }; }


function settlePending(state: StatePort, binding: HaulingBinding, view: HaulingView, ports: HaulingPorts): Outcome | undefined {
  const previous = createTransferJournal(state, binding.unit).read();
  if (!previous.attempt || previous.acknowledged) return previous.result?.status === 'unknown' ? retireUnknown(state,binding,view) : undefined;
  const settled = settleHaulingTransfer(state, binding, ports.observe(previous.attempt), (_attempt, result) => {
    if (result.status === 'observed') refreshCargoBooking(state, binding, view);
  });
  return settled?.status === 'waiting' ? wait(view.tick,'transfer-pending') : retireUnknown(state,binding,view);
}

function unavailable(state: StatePort, binding: HaulingBinding, view: HaulingView): Outcome {
  if (view.cargo === 0 && (view.minimumCollection ?? 0) > 0) return finish(state, binding, view);
  return wait(view.tick, 'logistics-capacity-unavailable');
}

function unusableDestination(view: HaulingView): boolean {
  return view.sinkStatus === 'missing' || (view.sinkStatus === 'visible' && view.sinkFree === 0 && view.cargo > 0);
}

function retireUnknown(state: StatePort, binding: HaulingBinding, view: HaulingView): Outcome | undefined {
  return abandonUnknownTransfer(state,binding,view.tick,view.cargo) ? { status: 'failed',reason: 'transfer-evidence-lost' } : undefined;
}
