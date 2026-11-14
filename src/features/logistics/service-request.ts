import type { StatePort } from '../../persistence/versioned-state';
import { createQuantityReservations } from '../../persistence/quantities/store';
import { logisticsPool } from '../../capabilities/logistics/request';
import { createLogisticsRequests } from './request-store';
export interface ServiceTransfer { direction: string; source: string; sink: string; resource: string; quantity: number }
/** One service direction per room; admitted cargo finishes before reversing direction. */
export function reconcileServiceRequest(state: StatePort, room: string, tick: number, owner: string, priority: number, desired: ServiceTransfer | undefined): void {
  const queue = createLogisticsRequests(state, room);
  const reserved = new Set(createQuantityReservations(state).list(tick).flatMap(claim => claim.allocations.map(item => item.pool)));
  for (const request of queue.pending(tick).filter(item => item.owner === owner)) {
    if (reserved.has(logisticsPool('request', owner, request.id))) continue;
    const matches = matchesDesired(request, desired);
    if (!matches) queue.cancel(owner, request.id);
  }
  if (!desired || queue.pending(tick).some(item => item.owner === owner) || queue.availableSlots(tick) === 0) return;
  queue.submit({ id: JSON.stringify([desired.direction, desired.source, desired.sink, desired.resource, tick]), owner,
    source: desired.source, sink: desired.sink, resource: desired.resource, quantity: desired.quantity, priority, expiresAt: tick + 100 }, tick);
}

function matchesDesired(request: Omit<ServiceTransfer, 'direction'>, desired: ServiceTransfer | undefined): boolean {
  return !!desired && request.source === desired.source && request.sink === desired.sink
    && request.resource === desired.resource && request.quantity <= desired.quantity;
}
