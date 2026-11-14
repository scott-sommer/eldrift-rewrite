import { expect, test } from 'vitest';
import { reconcileSupportRequests } from '../../src/features/recovery/support-requests';
import { supportOwner } from '../../src/features/recovery/support-identity';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { reserveTransfer } from '../../src/features/logistics/reserve-transfer';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import type { Envelope } from '../../src/persistence/versioned-state';
const plan = { home: 'W0N1', target: 'W1N1', active: true, batch: 120, lifetime: 1500 };
const sources = [{ id: 'donor-storage', resource: 'energy', amount: 1000, minimumBatch: 0, priority: 0 }];
const sinks = [{ id: 'target-storage', free: 500, priority: 0 }];
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  return { state, queue: createLogisticsRequests(state, plan.home) };
}
test('support commitments stay bounded per route across repeated reconciliation and replenish confirmed delivery', () => {
  const { state, queue } = fixture();
  expect(reconcileSupportRequests(state, plan, sources, sinks, 1)).toBe(1);
  expect(queue.pending(1)[0]!.quantity).toBe(120);
  expect(reconcileSupportRequests(state, plan, sources, sinks, 2)).toBe(0);
  const request = queue.pending(2)[0]!;
  queue.confirm(request.owner, request.id, { id: 'observed', amount: 50 }, 3);
  expect(reconcileSupportRequests(state, plan, [{ ...sources[0]!, amount: 950 }], [{ ...sinks[0]!, free: 450 }], 3)).toBe(1);
  expect(queue.pending(3).map(item => item.quantity)).toEqual([70, 50]);
  expect(reconcileSupportRequests(state, plan, sources, sinks, 4)).toBe(0);
});
test('local and other-target commitments consume shared donor stock before new support requests', () => {
  const { state, queue } = fixture();
  queue.submit({ id: 'local', owner: 'local', source: 'donor-storage', sink: 'spawn', resource: 'energy', quantity: 70, priority: 0, expiresAt: 100 }, 1);
  const limited = [{ ...sources[0]!, amount: 100 }];
  reconcileSupportRequests(state, plan, limited, sinks, 1);
  expect(queue.pending(1).find(item => item.owner === supportOwner(plan.home, plan.target))?.quantity).toBe(30);
  expect(reconcileSupportRequests(state, { ...plan, target: 'W2N1' }, limited, [{ id: 'other-storage', free: 500, priority: 0 }], 1)).toBe(0);
});
test('exit preserves admitted delivery and removes only obsolete unreserved work after settlement', () => {
  const { state, queue } = fixture();
  reconcileSupportRequests(state, plan, sources, sinks, 1);
  const request = queue.pending(1)[0]!;
  reserveTransfer(state, request, { holder: 'support', scope: 'delivery', phase: 'deliver', maximum: 50, expiresAt: 5 },
    { sourceStock: 0, sinkFree: 500, sinkPool: 'target' }, 1);
  reconcileSupportRequests(state, { ...plan, active: false }, [], [], 2);
  expect(queue.pending(2)).toHaveLength(1);
  expect(queue.confirm(request.owner, request.id, { id: 'delivered', amount: 50 }, 3)).toBe(true);
  createQuantityReservations(state).releaseScope('delivery');
  reconcileSupportRequests(state, { ...plan, active: false }, [], [], 3);
  expect(queue.pending(3)).toEqual([]);
});
test('full storage redirects unassigned support to terminal and inactive unknown routes create no state', () => {
  const { state, queue } = fixture();
  reconcileSupportRequests(state, { ...plan, active: false }, [], [], 1);
  expect(state.read('logistics-requests/' + plan.home)).toBeUndefined();
  reconcileSupportRequests(state, plan, sources, sinks, 2);
  expect(reconcileSupportRequests(state, plan, sources, [{ id: 'target-terminal', free: 30, priority: 1 }], 3)).toBe(1);
  expect(queue.pending(3).map(item => [item.sink, item.quantity])).toEqual([['target-terminal', 30]]);
});
