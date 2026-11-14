import type { StatePort } from '../../persistence/versioned-state';
import { createQuantityReservations } from '../../persistence/quantities/store';
import { logisticsPool } from '../../capabilities/logistics/request';
import { createLogisticsRequests } from './request-store';
export interface SupplyObservation { id: string; resource: string; amount: number; minimumBatch?: number }
/** Complete visible-room snapshots retire infeasible unreserved work, never infer delivery. */
export function reconcileSupplySources(state: StatePort, room: string, owner: string, tick: number,
  sources: readonly SupplyObservation[], resource?: string): number {
  const queue = createLogisticsRequests(state, room);
  const reserved = new Set(createQuantityReservations(state).list(tick).flatMap(claim => claim.allocations.map(item => item.pool)));
  const stocked = new Map(sources.filter(source => source.amount > 0)
    .map(source => [stockKey(source.id, source.resource), source.minimumBatch ?? 0]));
  const requests = queue.pending(tick).filter(request => request.owner === owner && (resource === undefined || request.resource === resource));
  let cancelled = 0;
  for (const request of requests) {
    const minimum = stocked.get(stockKey(request.source, request.resource));
    if (minimum !== undefined && request.quantity >= minimum) continue;
    if (reserved.has(logisticsPool('request', request.owner, request.id))) continue;
    if (queue.cancel(owner, request.id)) cancelled++;
  }
  return cancelled;
}
function stockKey(id: string, resource: string): string { return logisticsPool('observed-stock', id, resource); }
