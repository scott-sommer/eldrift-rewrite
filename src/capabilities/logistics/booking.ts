import { logisticsPool, validateLogisticsRequest } from './request';
import type { LogisticsRequest } from './request';
import type { QuantityClaim } from '../../core/resources/quantity-claim';
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
export interface PreparedTransferBooking {
  identity: Pick<QuantityClaim, 'id' | 'owner' | 'holder' | 'scope'>;
  capacities: Record<string, number>;
  expiresAt: number;
  maximum: number;
  minimum: number;
  tick: number;
  releasePool: string | undefined;
}
/** Validate before touching a ledger; expired requests never initialize persistent state. */
export function prepareTransferBooking(request: LogisticsRequest, booking: TransferBooking,
  observed: TransferAvailability, tick: number): PreparedTransferBooking | undefined {
  validateLogisticsRequest(request);
  validateBooking(booking, observed, tick);
  if (request.expiresAt <= tick) return undefined;
  return {
    identity: { id: logisticsPool('booking', request.owner, request.id, booking.scope),
      owner: request.owner, holder: booking.holder, scope: booking.scope },
    capacities: pools(request, booking.phase, observed),
    expiresAt: Math.min(request.expiresAt, booking.expiresAt), maximum: booking.maximum,
    minimum: booking.phase === 'collect' ? observed.minimumCollection ?? 0 : 0, tick,
    releasePool: booking.phase === 'deliver' ? logisticsPool('stock', request.source, request.resource) : undefined,
  };
}
/** Pure allocation policy shared by execution and isolated forecasts; the ledger owns mutations. */
export function calculateTransferBooking(prepared: PreparedTransferBooking, claims: readonly QuantityClaim[]):
  { claim: QuantityClaim; amount: number } | undefined {
  const other = claims.filter(claim => claim.expiresAt > prepared.tick && claim.id !== prepared.identity.id);
  const available = Object.entries(prepared.capacities).map(([pool, capacity]) => capacity - other
    .flatMap(claim => claim.allocations).filter(item => item.pool === pool).reduce((sum, item) => sum + item.amount, 0));
  const amount = Math.max(0, Math.min(prepared.maximum, ...available));
  if (amount === 0 || amount < prepared.minimum) return undefined;
  return { amount, claim: { ...prepared.identity, expiresAt: prepared.expiresAt,
    allocations: Object.keys(prepared.capacities).map(pool => ({ pool, amount })) } };
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


