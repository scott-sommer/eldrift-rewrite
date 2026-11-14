import { reconcileEnergySources } from './reconcile-energy-sources';
import type { StatePort } from '../../persistence/versioned-state';
import type { Position } from '../../capabilities/movement/step';
import { logisticsPool } from '../../capabilities/logistics/request';
import { createLogisticsRequests } from './request-store';
export interface EnergyEndpoint { id: string; position: Position; amount: number; priority: number; minimumBatch?: number; allowedSinks?: readonly string[] }
export interface EnergySupplyPolicy { owner: string; lifetime: number; maximumQuantity: number; maximumNewRequests: number }
/** Observed deficits become bounded requests; existing work retains its identity and priority. */
export function generateEnergyRequests(state: StatePort, room: string, tick: number,
  sources: readonly EnergyEndpoint[], sinks: readonly EnergyEndpoint[], policy: EnergySupplyPolicy): number {
  validate(policy, [...sources, ...sinks]);
  reconcileEnergySources(state, room, policy.owner, tick, sources);
  const queue = createLogisticsRequests(state, room);
  const pending = queue.pending(tick).filter(request => request.resource === 'energy');
  const stock = new Map(sources.map(source => [source.id, Math.max(0, source.amount - pending
    .filter(request => request.source === source.id).reduce((sum, request) => sum + request.quantity, 0))]));
  let available = Math.min(policy.maximumNewRequests, queue.availableSlots(tick));
  let created = 0;
  for (const sink of [...sinks].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))) {
    if (available === 0) break;
    if (sink.amount === 0 || pending.some(request => request.sink === sink.id)) continue;
    const source = nearestSource(sources, sink, stock, policy.maximumQuantity);
    if (!source) continue;
    const quantity = Math.min(stock.get(source.id)!, sink.amount, policy.maximumQuantity);
    queue.submit({ id: logisticsPool('energy', sink.id, String(tick)), owner: policy.owner, source: source.id, sink: sink.id,
      resource: 'energy', quantity, priority: sink.priority, expiresAt: tick + policy.lifetime }, tick);
    stock.set(source.id, stock.get(source.id)! - quantity);
    available--; created++;
  }
  return created;
}
function nearestSource(sources: readonly EnergyEndpoint[], sink: EnergyEndpoint, stock: ReadonlyMap<string, number>, maximum: number) {
  return sources.filter(source => (source.allowedSinks === undefined || source.allowedSinks.includes(sink.id)) && source.id !== sink.id && (stock.get(source.id) ?? 0) > 0 && fitsBatch(source, sink, stock, maximum))
    .sort((a, b) => a.priority - b.priority || distance(a, sink) - distance(b, sink) || a.id.localeCompare(b.id))[0];
}
function distance(a: EnergyEndpoint, b: EnergyEndpoint): number {
  return Math.max(Math.abs(a.position.x - b.position.x), Math.abs(a.position.y - b.position.y));
}
function validate(policy: EnergySupplyPolicy, endpoints: readonly EnergyEndpoint[]): void {
  if (!policy.owner || ![policy.lifetime, policy.maximumQuantity, policy.maximumNewRequests]
    .every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Invalid energy supply policy');
  if (!endpoints.every(item => item.id && Number.isSafeInteger(item.amount) && item.amount >= 0 && Number.isFinite(item.priority) && Number.isSafeInteger(item.minimumBatch ?? 0) && (item.minimumBatch ?? 0) >= 0)) {
    throw new Error('Invalid energy endpoint');
  }
}

function fitsBatch(source: EnergyEndpoint, sink: EnergyEndpoint, stock: ReadonlyMap<string, number>, maximum: number): boolean {
  return Math.min(stock.get(source.id) ?? 0, sink.amount, maximum) >= (source.minimumBatch ?? 0);
}
