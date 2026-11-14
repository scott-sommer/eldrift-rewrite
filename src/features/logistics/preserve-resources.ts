import { reconcileSupplySources } from './reconcile-supply-sources';
import type { StatePort } from '../../persistence/versioned-state';
import { createLogisticsRequests } from './request-store';
import { logisticsPool } from '../../capabilities/logistics/request';
export interface RecoverableStock { id: string; resource: string; amount: number; minimumBatch: number; priority: number }
export interface PreservationSink { id: string; free: number; priority: number }
export interface PreservationPolicy { owner: string; lifetime: number; maximumQuantity: number; maximumNewRequests: number }
/** Only perishable sources enter this policy; shared sink capacity is budgeted across all resources. */
export function preserveResources(state: StatePort, room: string, tick: number, sources: readonly RecoverableStock[],
  sinks: readonly PreservationSink[], policy: PreservationPolicy): number {
  reconcileSupplySources(state, room, policy.owner, tick, sources);
  const queue = createLogisticsRequests(state, room);
  const pending = queue.pending(tick);
  const free = new Map(sinks.map(sink => [sink.id, Math.max(0, sink.free - pending.filter(item => item.sink === sink.id)
    .reduce((sum, item) => sum + item.quantity, 0))]));
  let created = 0;
  const limit = Math.min(policy.maximumNewRequests, queue.availableSlots(tick));
  const orderedSinks = [...sinks].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  for (const source of [...sources].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id) || a.resource.localeCompare(b.resource))) {
    if (created >= limit) break;
    const stock = source.amount - pending.filter(item => item.source === source.id && item.resource === source.resource)
      .reduce((sum, item) => sum + item.quantity, 0);
    const sink = orderedSinks.find(item => item.id !== source.id && quantity(stock, free.get(item.id)!, source.minimumBatch, policy.maximumQuantity) > 0);
    if (!sink) continue;
    const amount = quantity(stock, free.get(sink.id)!, source.minimumBatch, policy.maximumQuantity);
    queue.submit({ id: logisticsPool('preserve', source.id, source.resource, sink.id, String(tick)), owner: policy.owner,
      source: source.id, sink: sink.id, resource: source.resource, quantity: amount, priority: 10, expiresAt: tick + policy.lifetime }, tick);
    free.set(sink.id, free.get(sink.id)! - amount);
    created++;
  }
  return created;
}
function quantity(stock: number, free: number, minimum: number, maximum: number): number {
  const amount = Math.max(0, Math.min(stock, free, maximum));
  return amount >= minimum ? amount : 0;
}
