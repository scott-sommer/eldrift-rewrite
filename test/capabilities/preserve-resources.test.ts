import { reserveTransfer } from '../../src/features/logistics/reserve-transfer';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { expect, test } from 'vitest';
import { preserveResources } from '../../src/features/logistics/preserve-resources';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import type { Envelope } from '../../src/persistence/versioned-state';
const policy = { owner: 'preserve', lifetime: 100, maximumQuantity: 200, maximumNewRequests: 10 };
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  return { state, queue: createLogisticsRequests(state, 'home') };
}
test('preservation budgets shared capacity across minerals and energy then falls back to terminal', () => {
  const { state, queue } = fixture();
  const sources = [{ id: 'tomb', resource: 'H', amount: 30, minimumBatch: 0, priority: 0 }, { id: 'ruin', resource: 'energy', amount: 30, minimumBatch: 0, priority: 1 }];
  const sinks = [{ id: 'storage', free: 30, priority: 0 }, { id: 'terminal', free: 30, priority: 1 }];
  expect(preserveResources(state, 'home', 1, sources, sinks, policy)).toBe(2);
  expect(queue.pending(1).map(item => [item.resource, item.sink, item.quantity]).sort()).toEqual([['H', 'storage', 30], ['energy', 'terminal', 30]]);
  expect(preserveResources(state, 'home', 2, sources, sinks, policy)).toBe(0);
});
test('urgent requests consume source stock first and indivisible drops require a fitting sink', () => {
  const { state, queue } = fixture();
  queue.submit({ id: 'urgent', owner: 'energy', source: 'drop', sink: 'spawn', resource: 'energy', quantity: 50, priority: 0, expiresAt: 100 }, 1);
  const sources = [{ id: 'drop', resource: 'energy', amount: 100, minimumBatch: 50, priority: 0 }];
  expect(preserveResources(state, 'home', 1, sources, [{ id: 'storage', free: 40, priority: 0 }], policy)).toBe(0);
  expect(preserveResources(state, 'home', 1, sources, [{ id: 'storage', free: 100, priority: 0 }], policy)).toBe(1);
  expect(queue.pending(1).find(item => item.owner === 'preserve')?.quantity).toBe(50);
});

test('mineral delivery remains protected after decay, then obsolete residual demand releases capacity', () => {
  const { state, queue } = fixture();
  const sinks = [{ id: 'storage', free: 30, priority: 0 }];
  preserveResources(state, 'home', 1, [{ id: 'tomb', resource: 'H', amount: 30, minimumBatch: 0, priority: 0 }], sinks, policy);
  const request = queue.pending(1)[0]!;
  reserveTransfer(state, request, { holder: 'courier', scope: 'task', phase: 'deliver', maximum: 20, expiresAt: 4 },
    { sourceStock: 0, sinkFree: 30, sinkPool: 'storage' }, 1);
  preserveResources(state, 'home', 2, [], sinks, policy);
  expect(queue.pending(2)).toHaveLength(1);
  queue.confirm(request.owner, request.id, { id: 'delivered', amount: 20 }, 2);
  createQuantityReservations(state).releaseScope('task');
  expect(preserveResources(state, 'home', 3, [{ id: 'new-drop', resource: 'H', amount: 10, minimumBatch: 10, priority: 0 }], sinks, policy)).toBe(1);
  expect(queue.pending(3).map(item => [item.source, item.quantity])).toEqual([['new-drop', 10]]);
});

test('different resource remaining in a tombstone does not keep depleted mineral work alive', () => {
  const { state, queue } = fixture();
  const sinks = [{ id: 'storage', free: 30, priority: 0 }];
  preserveResources(state, 'home', 1, [{ id: 'tomb', resource: 'H', amount: 30, minimumBatch: 0, priority: 0 }], sinks, policy);
  preserveResources(state, 'home', 2, [{ id: 'tomb', resource: 'energy', amount: 30, minimumBatch: 0, priority: 0 }], sinks, policy);
  expect(queue.pending(2).map(item => item.resource)).toEqual(['energy']);
});

test('unassigned work switches from newly full storage to terminal without waiting for expiry', () => {
  const { state, queue } = fixture();
  const sources = [{ id: 'tomb', resource: 'H', amount: 30, minimumBatch: 0, priority: 0 }];
  preserveResources(state, 'home', 1, sources, [{ id: 'storage', free: 30, priority: 0 }], policy);
  expect(preserveResources(state, 'home', 2, sources, [{ id: 'storage', free: 0, priority: 0 }, { id: 'terminal', free: 30, priority: 1 }], policy)).toBe(1);
  expect(queue.pending(2).map(item => item.sink)).toEqual(['terminal']);
});
