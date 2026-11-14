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
