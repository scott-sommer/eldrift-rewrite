import { expect, test } from 'vitest';
import { calculateTransferBooking, prepareTransferBooking } from '../../src/capabilities/logistics/booking';
import { reserveTransfer } from '../../src/features/logistics/reserve-transfer';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import type { Envelope } from '../../src/persistence/versioned-state';
const request = { id: 'fill', owner: 'logistics', source: 'container', sink: 'storage', resource: 'energy',
  quantity: 50, priority: 0, expiresAt: 100 };
const observed = { sourceStock: 100, sinkFree: 100, sinkPool: logisticsPool('capacity', 'storage') };
const booking = { holder: 'a', scope: 'task:a', phase: 'collect' as const, maximum: 30, expiresAt: 20 };
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, value); } };
  return { state, ledger: createQuantityReservations(state) };
}
test('splits a request across haulers without overbooking its quantity even with ample stock and capacity', () => {
  const { state, ledger } = fixture();
  expect(reserveTransfer(state, request, booking, observed, 1)).toBe(30);
  expect(reserveTransfer(state, request, { ...booking, holder: 'b', scope: 'task:b' }, observed, 1)).toBe(20);
  expect(reserveTransfer(state, request, { ...booking, holder: 'c', scope: 'task:c' }, observed, 1)).toBe(0);
  expect(ledger.list(1)).toHaveLength(2);
});
test('confirmed pickup removes the stock claim while retaining request and sink obligations', () => {
  const { state, ledger } = fixture();
  reserveTransfer(state, request, booking, observed, 1);
  expect(reserveTransfer(state, request, { ...booking, phase: 'deliver', maximum: 20 },
    { ...observed, sourceStock: 0 }, 2)).toBe(20);
  const allocations = ledger.list(2)[0]!.allocations;
  expect(allocations).toHaveLength(2);
  expect(allocations.every(item => item.amount === 20)).toBe(true);
  expect(allocations.some(item => item.pool === logisticsPool('stock', 'container', 'energy'))).toBe(false);
});
test('separate resource requests share destination capacity and repeated booking remains stable', () => {
  const { state } = fixture();
  expect(reserveTransfer(state, request, booking, { ...observed, sinkFree: 40 }, 1)).toBe(30);
  expect(reserveTransfer(state, request, booking, { ...observed, sinkFree: 40 }, 2)).toBe(30);
  expect(reserveTransfer(state, { ...request, id: 'mineral', resource: 'H' },
    { ...booking, holder: 'b', scope: 'task:b' }, { ...observed, sinkFree: 40 }, 2)).toBe(10);
});
test('capacity loss cannot authorize delivery and does not erase an in-transit obligation', () => {
  const { state, ledger } = fixture();
  reserveTransfer(state, request, booking, observed, 1);
  expect(reserveTransfer(state, request, { ...booking, phase: 'deliver' }, { ...observed, sinkFree: 0 }, 2)).toBe(0);
  expect(ledger.list(2)).toHaveLength(1);
  expect(ledger.list(2)[0]!.allocations).toHaveLength(2);
  expect(ledger.list(2)[0]!.allocations.some(item => item.pool === logisticsPool('stock', 'container', 'energy'))).toBe(false);
});


test('portable booking renews its own allocation while respecting outstanding quantity and foreign sink claims', () => {
  const initial = prepareTransferBooking(request, booking, observed, 1)!;
  const own = calculateTransferBooking(initial, [])!.claim;
  const foreign = { ...own, id: 'foreign', holder: 'b', scope: 'other',
    allocations: [{ pool: observed.sinkPool, amount: 90 }] };
  const reduced = prepareTransferBooking({ ...request, quantity: 8 }, booking, observed, 2)!;
  expect(calculateTransferBooking(reduced, [own, foreign])?.amount).toBe(8);
  expect(calculateTransferBooking(initial, [own])?.amount).toBe(30);
  expect(calculateTransferBooking(initial, [{ ...foreign, expiresAt: 1 }])?.amount).toBe(30);
});

test('portable booking rejects partial native pickup and pool collisions', () => {
  const prepared = prepareTransferBooking(request, booking, { ...observed, sourceStock: 20, minimumCollection: 30 }, 1)!;
  expect(calculateTransferBooking(prepared, [])).toBeUndefined();
  expect(() => prepareTransferBooking(request, booking,
    { ...observed, sinkPool: logisticsPool('request', request.owner, request.id) }, 1)).toThrow('collision');
});

test('expired requests never open storage and claim identity conflicts remain ledger-owned', () => {
  const untouched = { read: () => { throw new Error('unexpected read'); }, write: () => { throw new Error('unexpected write'); } };
  expect(reserveTransfer(untouched, { ...request, expiresAt: 1 }, booking, observed, 1)).toBe(0);
  const { state } = fixture();
  reserveTransfer(state, request, booking, observed, 1);
  expect(() => reserveTransfer(state, request, { ...booking, holder: 'impostor' }, observed, 1)).toThrow('identity conflict');
});
