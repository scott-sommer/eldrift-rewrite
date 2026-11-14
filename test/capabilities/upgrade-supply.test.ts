import { expect, test } from 'vitest';
import { reconcileUpgradeSupply, upgradeSupplyBody, upgradeSupplyOwner } from '../../src/features/work/upgrade-supply';
import { reconcileSupportRequests } from '../../src/features/recovery/support-requests';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { reserveTransfer } from '../../src/features/logistics/reserve-transfer';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import type { Envelope } from '../../src/persistence/versioned-state';
const plan = { home: 'W0N1', target: 'E0N1', active: true, reserve: 100, batch: 1650, lifetime: 1500 };
const donor = { id: 'donor', owned: true, energy: 200, free: 1000 };
const target = { id: 'target', owned: true, energy: 0, free: 1000 };
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  return { state, queue: createLogisticsRequests(state, plan.home) };
}
test('specialist supply body keeps the legacy full cargo and mobility budget', () => {
  expect(upgradeSupplyBody(2499)).toBeUndefined();
  const body = upgradeSupplyBody(2500)!;
  expect(body.cost).toBe(2500);
  expect(body.parts.filter(part => part === 'carry')).toHaveLength(33);
  expect(body.parts.filter(part => part === 'move')).toHaveLength(17);
  expect(() => upgradeSupplyOwner(plan.home, plan.home)).toThrow();
});
test('upgrade supply shares stock commitments with recovery routes and respects sponsor reserve', () => {
  const { state, queue } = fixture();
  reconcileSupportRequests(state, { ...plan, target: 'W1N1', batch: 70 },
    [{ id: donor.id, resource: 'energy', amount: 200, minimumBatch: 1, priority: 0 }],
    [{ id: 'recovery', free: 100, priority: 0 }], 1);
  expect(reconcileUpgradeSupply(state, plan, donor, target, 1)).toBe(1);
  expect(queue.pending(1).find(item => item.owner === upgradeSupplyOwner(plan.home, plan.target))?.quantity).toBe(30);
  expect(reconcileUpgradeSupply(state, plan, donor, target, 2)).toBe(0);
  reconcileUpgradeSupply(state, plan, donor, { ...target, owned: false }, 3);
  expect(queue.pending(3).map(item => item.sink)).toEqual(['recovery']);
});
test('stopping supply preserves in-transit delivery until receipt and releases unreserved demand', () => {
  const { state, queue } = fixture();
  reconcileUpgradeSupply(state, plan, donor, target, 1);
  const request = queue.pending(1)[0]!;
  reserveTransfer(state, request, { holder: 'hauler', scope: 'delivery', phase: 'deliver', maximum: 50, expiresAt: 10 },
    { sourceStock: 0, sinkFree: target.free, sinkPool: 'target' }, 1);
  reconcileUpgradeSupply(state, { ...plan, active: false }, donor, target, 2);
  expect(queue.pending(2)).toHaveLength(1);
  expect(queue.confirm(request.owner, request.id, { id: 'receipt', amount: 50 }, 3)).toBe(true);
  createQuantityReservations(state).releaseScope('delivery');
  reconcileUpgradeSupply(state, { ...plan, active: false }, donor, target, 3);
  expect(queue.pending(3)).toEqual([]);
});
