import type { StatePort } from '../../../persistence/versioned-state';
import { createQuantityReservations } from '../../../persistence/quantities/store';
import { logisticsPool } from '../../../capabilities/logistics/request';
import { createLogisticsRequests } from '../request-store';
import type { LinkService } from './service';
/** One service direction per room; admitted cargo finishes before reversing direction. */
export function reconcileLinkService(state: StatePort, room: string, tick: number, desired: LinkService | undefined): void {
  const owner = 'link-service:' + room;
  const queue = createLogisticsRequests(state, room);
  const reserved = new Set(createQuantityReservations(state).list(tick).flatMap(claim => claim.allocations.map(item => item.pool)));
  for (const request of queue.pending(tick).filter(item => item.owner === owner)) {
    if (reserved.has(logisticsPool('request', owner, request.id))) continue;
    const matches = desired && request.source === desired.source && request.sink === desired.sink && request.quantity <= desired.quantity;
    if (!matches) queue.cancel(owner, request.id);
  }
  if (!desired || queue.pending(tick).some(item => item.owner === owner) || queue.availableSlots(tick) === 0) return;
  queue.submit({ id: JSON.stringify([desired.direction, desired.source, desired.sink, tick]), owner,
    source: desired.source, sink: desired.sink, resource: 'energy', quantity: desired.quantity, priority: 3, expiresAt: tick + 100 }, tick);
}
