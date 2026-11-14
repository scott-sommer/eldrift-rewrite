import { expect, test } from 'vitest';
import { reconcileEnergySources } from '../../src/features/logistics/reconcile-energy-sources';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { reserveTransfer } from '../../src/features/logistics/reserve-transfer';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import type { Envelope } from '../../src/persistence/versioned-state';
test('source reconciliation protects in-flight delivery and other owners, then releases abandoned demand', () => {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const queue = createLogisticsRequests(state, 'home');
  const request = { id: 'fill', owner: 'room', source: 'tomb', sink: 'spawn', resource: 'energy', quantity: 30, priority: 0, expiresAt: 100 };
  queue.submit(request, 1);
  queue.submit({ ...request, owner: 'external' }, 1);
  reserveTransfer(state, request, { holder: 'courier', scope: 'work', phase: 'deliver', maximum: 30, expiresAt: 3 },
    { sourceStock: 0, sinkFree: 50, sinkPool: 'sink' }, 1);
  expect(reconcileEnergySources(state, 'home', 'room', 2, [])).toBe(0);
  expect(queue.pending(2)).toHaveLength(2);
  createQuantityReservations(state).releaseScope('work');
  expect(reconcileEnergySources(state, 'home', 'room', 2, [])).toBe(1);
  expect(queue.pending(2).map(item => item.owner)).toEqual(['external']);
});
