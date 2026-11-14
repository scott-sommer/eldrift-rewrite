import { expect, test } from 'vitest';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import type { QuantityClaim } from '../../src/persistence/quantities/schema';
import type { Envelope } from '../../src/persistence/versioned-state';
function fixture() {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => {
    records.set(key, JSON.parse(JSON.stringify(value)) as Envelope);
  } };
  return { records, port, ledger: createQuantityReservations(port) };
}
function claim(id: string, amount: number, resource = 'energy'): QuantityClaim {
  return { id, owner: 'logistics', holder: id, scope: 'task:' + id, expiresAt: 10,
    allocations: [{ pool: 'stock:source:' + resource, amount }, { pool: 'capacity:storage', amount }] };
}
const capacities = { 'stock:source:energy': 100, 'stock:source:H': 100, 'capacity:storage': 80 };
test('reserves stock and shared sink capacity atomically across resources and reconstruction', () => {
  const { port, ledger } = fixture();
  expect(ledger.reserve(claim('first', 50), capacities, 1)).toBe(true);
  const restored = createQuantityReservations(port);
  expect(restored.reserve(claim('second', 40, 'H'), capacities, 2)).toBe(false);
  expect(restored.list(2)).toHaveLength(1);
  expect(restored.reserve(claim('second', 30, 'H'), capacities, 2)).toBe(true);
  expect(restored.reserve(claim('third', 1), capacities, 2)).toBe(false);
});
test('stock shortage cannot reserve otherwise free sink capacity', () => {
  const { ledger } = fixture();
  expect(ledger.reserve(claim('first', 50), { ...capacities, 'stock:source:energy': 10 }, 1)).toBe(false);
  expect(ledger.list(1)).toEqual([]);
});
test('renewal replaces its own quantity but cannot steal another identity or overbook', () => {
  const { ledger } = fixture();
  ledger.reserve(claim('first', 50), capacities, 1);
  expect(ledger.reserve(claim('first', 50), capacities, 2)).toBe(true);
  expect(ledger.reserve(claim('first', 90), capacities, 2)).toBe(false);
  expect(() => ledger.reserve({ ...claim('first', 1), holder: 'thief' }, capacities, 2)).toThrow();
  expect(ledger.list(2)[0]!.allocations[0]!.amount).toBe(50);
  expect(ledger.reserve(claim('first', 20), capacities, 2)).toBe(true);
  expect(ledger.reserve(claim('second', 60), capacities, 2)).toBe(true);
});
test('expiry, cancellation and holder retirement release all pools', () => {
  const { ledger } = fixture();
  ledger.reserve(claim('first', 40), capacities, 1);
  ledger.reserve(claim('second', 40), capacities, 1);
  expect(ledger.releaseScope('task:first')).toBe(1);
  expect(ledger.releaseHolder('second')).toBe(1);
  ledger.reserve(claim('third', 80), capacities, 2);
  expect(ledger.list(10)).toEqual([]);
  expect(ledger.expire(10)).toBe(1);
});
test('malformed capacities and allocations leave existing bookings untouched', () => {
  const { ledger } = fixture();
  ledger.reserve(claim('first', 40), capacities, 1);
  expect(() => ledger.reserve(claim('second', 20), {}, 2)).toThrow();
  expect(() => ledger.reserve({ ...claim('second', 20), allocations: [] }, capacities, 2)).toThrow();
  expect(() => ledger.list(-1)).toThrow();
  const copy = ledger.list(2);
  copy[0]!.allocations[0]!.amount = 10000;
  expect(ledger.list(2)[0]!.allocations[0]!.amount).toBe(40);
});
