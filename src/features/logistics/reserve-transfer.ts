import type { StatePort } from '../../persistence/versioned-state';
import { createQuantityReservations } from '../../persistence/quantities/store';
import { logisticsPool, validateLogisticsRequest } from '../../capabilities/logistics/request';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
export interface TransferBooking {
  holder: string;
  scope: string;
  phase: 'collect' | 'deliver';
  maximum: number;
  expiresAt: number;
}
export interface TransferAvailability {
  sourceStock: number;
  /** Pickup cannot limit its quantity; reserve the entire native collection amount. */
  minimumCollection?: number;
  sinkFree: number;
  /** Shared stores use one pool across resources; specialized stores use their resource compartment. */
  sinkPool: string;
}
/** Reserve outstanding request quantity and storage, dropping the stock claim after confirmed pickup. */
export function reserveTransfer(state: StatePort, request: LogisticsRequest, booking: TransferBooking,
  observed: TransferAvailability, tick: number): number {
  validateLogisticsRequest(request);
  validateBooking(booking, observed, tick);
  if (request.expiresAt <= tick) return 0;
  const ledger = createQuantityReservations(state);
  const id = logisticsPool('booking', request.owner, request.id, booking.scope);
  const capacities = pools(request, booking.phase, observed);
  if (booking.phase === 'deliver') ledger.releasePool({ id, owner: request.owner, holder: booking.holder, scope: booking.scope },
    logisticsPool('stock', request.source, request.resource));
  const other = ledger.list(tick).filter(claim => claim.id !== id);
  const available = Object.entries(capacities).map(([pool, capacity]) => capacity - other
    .flatMap(claim => claim.allocations).filter(item => item.pool === pool).reduce((sum, item) => sum + item.amount, 0));
  const amount = Math.max(0, Math.min(booking.maximum, ...available));
  if (amount === 0 || (booking.phase === 'collect' && amount < (observed.minimumCollection ?? 0))) return 0;
  const claim = { id, owner: request.owner, holder: booking.holder, scope: booking.scope,
    expiresAt: Math.min(request.expiresAt, booking.expiresAt),
    allocations: Object.keys(capacities).map(pool => ({ pool, amount })) };
  return ledger.reserve(claim, capacities, tick) ? amount : 0;
}
function pools(request: LogisticsRequest, phase: TransferBooking['phase'], observed: TransferAvailability) {
  const capacities: Record<string, number> = {
    [logisticsPool('request', request.owner, request.id)]: request.quantity,
    [observed.sinkPool]: observed.sinkFree,
  };
  if (phase === 'collect') capacities[logisticsPool('stock', request.source, request.resource)] = observed.sourceStock;
  if (Object.keys(capacities).length !== (phase === 'collect' ? 3 : 2)) throw new Error('Logistics pool identity collision');
  return capacities;
}
function validateBooking(booking: TransferBooking, observed: TransferAvailability, tick: number): void {
  if (![booking.holder, booking.scope, observed.sinkPool].every(value => typeof value === 'string' && value.length > 0)) throw new Error('Invalid booking identity');
  if (!['collect', 'deliver'].includes(booking.phase)) throw new Error('Invalid booking phase');
  if (![booking.maximum, observed.sourceStock, observed.sinkFree, observed.minimumCollection ?? 0, tick, booking.expiresAt]
    .every(value => Number.isSafeInteger(value) && value >= 0) || booking.expiresAt <= tick) throw new Error('Invalid booking values');
}

