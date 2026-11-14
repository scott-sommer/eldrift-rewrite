import { expect, test } from 'vitest';
import { generateEnergyRequests } from '../../src/features/logistics/energy-requests';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import type { Envelope } from '../../src/persistence/versioned-state';
const policy = { owner: 'room', lifetime: 100, maximumQuantity: 200, maximumNewRequests: 10 };
const endpoint = (id: string, amount: number, priority = 0) => ({ id, amount, priority, position: { room: 'home', x: 10, y: 10 } });
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  return { state, queue: createLogisticsRequests(state, 'home') };
}
test('generation prioritizes sinks and budgets shared source stock without duplicating pending work', () => {
  const { state, queue } = fixture();
  const sources = [endpoint('source', 80)];
  const sinks = [endpoint('extension', 50, 1), endpoint('spawn', 50)];
  expect(generateEnergyRequests(state, 'home', 1, sources, sinks, policy)).toBe(2);
  expect(queue.pending(1).map(item => [item.sink, item.quantity])).toEqual([['spawn', 50], ['extension', 30]]);
  expect(generateEnergyRequests(state, 'home', 2, sources, sinks, policy)).toBe(0);
  const first = queue.pending(2)[0]!;
  queue.confirm(first.owner, first.id, { id: 'delivery', amount: 50 }, 2);
  expect(generateEnergyRequests(state, 'home', 3, sources, [endpoint('spawn', 0)], policy)).toBe(0);
  expect(generateEnergyRequests(state, 'home', 4, sources, [endpoint('spawn', 20)], policy)).toBe(1);
  expect(queue.pending(4).find(item => item.sink === 'spawn')?.quantity).toBe(20);
});
test('completed retained records apply queue backpressure until expiry without throwing', () => {
  const { state, queue } = fixture();
  for (let index = 0; index < 200; index++) {
    queue.submit({ id: String(index), owner: 'other', source: 's', sink: 'd', resource: 'H', quantity: 1, priority: 0, expiresAt: 3 }, 1);
    queue.confirm('other', String(index), { id: 'receipt-' + index, amount: 1 }, 1);
  }
  const run = (tick: number) => generateEnergyRequests(state, 'home', tick, [endpoint('source', 50)], [endpoint('spawn', 50)], policy);
  expect(run(1)).toBe(0);
  expect(run(3)).toBe(0);
  expect(run(4)).toBe(1);
  expect(queue.availableSlots(4)).toBe(199);
});


test('source priority recovers perishable energy before nearer stock, then falls back when depleted', () => {
  const { state, queue } = fixture();
  const sources = [endpoint('stock', 100), { ...endpoint('tombstone', 30, -2), position: { room: 'home', x: 20, y: 20 } }, endpoint('ruin', 20, -1)];
  expect(generateEnergyRequests(state, 'home', 1, sources, [endpoint('first', 30), endpoint('second', 20), endpoint('third', 50)], policy)).toBe(3);
  expect(queue.pending(1).map(item => [item.sink, item.source, item.quantity])).toEqual([
    ['first', 'tombstone', 30], ['second', 'ruin', 20], ['third', 'stock', 50],
  ]);
});

test('disappeared unassigned supply is replaced immediately from another source', () => {
  const { state, queue } = fixture();
  generateEnergyRequests(state, 'home', 1, [endpoint('tombstone', 30)], [endpoint('spawn', 30)], policy);
  expect(generateEnergyRequests(state, 'home', 2, [endpoint('container', 30)], [endpoint('spawn', 30)], policy)).toBe(1);
  expect(queue.pending(2).map(item => item.source)).toEqual(['container']);
});

test('drop batches skip undersized sinks and request limits without blocking divisible sources', () => {
  const { state, queue } = fixture();
  const sources = [{ ...endpoint('drop', 1000, -3), minimumBatch: 50 }, endpoint('container', 30)];
  generateEnergyRequests(state, 'home', 1, sources, [endpoint('small', 20, 0), endpoint('large', 50, 1)], policy);
  expect(queue.pending(1).map(item => [item.sink, item.source, item.quantity])).toEqual([['small', 'container', 20], ['large', 'drop', 50]]);
  expect(generateEnergyRequests(state, 'home', 2, sources, [endpoint('capped', 50)], { ...policy, maximumQuantity: 10 })).toBe(1);
  expect(queue.pending(2).find(item => item.sink === 'capped')?.source).toBe('container');
});

test('changed pickup batch replaces an unreserved request that can no longer be collected', () => {
  const { state, queue } = fixture();
  generateEnergyRequests(state, 'home', 1, [{ ...endpoint('drop', 30, -3), minimumBatch: 30 }], [endpoint('sink', 50)], policy);
  expect(generateEnergyRequests(state, 'home', 2, [{ ...endpoint('drop', 100, -3), minimumBatch: 50 }], [endpoint('sink', 50)], policy)).toBe(1);
  expect(queue.pending(2).map(item => item.quantity)).toEqual([50]);
});
