import type { StatePort } from '../../persistence/versioned-state';
import { createQuantityReservations } from '../../persistence/quantities/store';
import { logisticsPool } from '../../capabilities/logistics/request';
import { createLogisticsRequests } from './request-store';
/** Complete owned-room observations may retire abandoned supply, while preserving reserved deliveries. */
export function reconcileEnergySources(state: StatePort, room: string, owner: string, tick: number,
  sources: readonly { id: string; amount: number }[]): number {
  const queue = createLogisticsRequests(state, room);
  const claims = createQuantityReservations(state).list(tick);
  const stocked = new Set(sources.filter(source => source.amount > 0).map(source => source.id));
  let cancelled = 0;
  for (const request of queue.pending(tick)) {
    if (request.owner !== owner || request.resource !== 'energy' || stocked.has(request.source)) continue;
    const pool = logisticsPool('request', request.owner, request.id);
    if (claims.some(claim => claim.allocations.some(item => item.pool === pool))) continue;
    if (queue.cancel(owner, request.id)) cancelled++;
  }
  return cancelled;
}
