import type { StatePort } from '../../persistence/versioned-state';
import { createQuantityReservations } from '../../persistence/quantities/store';
import { logisticsPool } from '../../capabilities/logistics/request';
import { createLogisticsRequests } from './request-store';
/** Unreserved preservation work may choose another durable destination on the next generation pass. */
export function reconcilePreservationSinks(state: StatePort, room: string, owner: string, tick: number,
  sinks: readonly { id: string; free: number }[]): void {
  const queue = createLogisticsRequests(state, room);
  const available = new Set(sinks.filter(sink => sink.free > 0).map(sink => sink.id));
  const reserved = new Set(createQuantityReservations(state).list(tick).flatMap(claim => claim.allocations.map(item => item.pool)));
  for (const request of queue.pending(tick)) {
    if (request.owner !== owner || available.has(request.sink)) continue;
    if (!reserved.has(logisticsPool('request', owner, request.id))) queue.cancel(owner, request.id);
  }
}
