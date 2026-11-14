import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { createLinkReservations } from '../../src/features/logistics/links/reservations';
import { planLinkTransfers } from '../../src/features/logistics/links/plan';
import { defaultLinkPolicy } from '../../src/features/logistics/links/model';
function fixture() {
  const state = createMemoryPort(() => memory);
  const memory = {};
  const ledger = createQuantityReservations(state);
  const capacity = (id: string) => logisticsPool('capacity', id, 'energy');
  const stock = logisticsPool('stock', 'source', 'energy');
  const links = ['source', 'sink'].map((id, index) => ({ id, position: { room: 'home', x: 10 + index, y: 10 },
    energy: index ? 0 : 800, capacity: 800, cooldown: 0, active: true }));
  const reservations = createLinkReservations(state, 1, 'links:home', capacity);
  const command = { source: 'source', sink: 'sink', amount: 500, expectedReceived: 485 };
  return { state, ledger, capacity, stock, links, reservations, command };
}
test('courier stock and capacity claims bound the native link plan without changing role thresholds', () => {
  const f = fixture();
  f.ledger.reserve({ id: 'courier', owner: 'haul', holder: 'unit', scope: 'task', expiresAt: 4,
    allocations: [{ pool: f.stock, amount: 100 }, { pool: f.capacity('sink'), amount: 300 }] },
  { [f.stock]: 800, [f.capacity('sink')]: 800 }, 1);
  const [source, sink] = f.links.map(f.reservations.available);
  expect(source!.energy).toBe(800);
  expect(planLinkTransfers({ inputs: [source!], storage: sink!, controllers: [], relays: [] }, 0, defaultLinkPolicy)).toEqual([f.command]);
  expect(f.reservations.issue(f.command, f.links, () => ({ status: 'issued', code: 0 }))).toBe(true);
  expect(f.reservations.available(f.links[1]!).availableCapacity).toBe(0);
});
test('issued claims survive duplicate invocation and expire next tick', () => {
  const f = fixture();
  f.reservations.issue(f.command, f.links, () => ({ status: 'issued', code: 0 }));
  expect(f.reservations.issue(f.command, f.links, () => { throw new Error('must not invoke'); })).toBe(false);
  expect(f.ledger.list(1)).toHaveLength(1);
  expect(f.ledger.list(2)).toEqual([]);
});
test('rejected and missing native targets release claims, while uncertain exceptions retain them', () => {
  const f = fixture();
  expect(f.reservations.issue(f.command, f.links, () => ({ status: 'rejected', code: -6 }))).toBe(false);
  expect(f.ledger.list(1)).toEqual([]);
  expect(f.reservations.issue(f.command, f.links, () => undefined)).toBe(false);
  expect(f.ledger.list(1)).toEqual([]);
  expect(() => f.reservations.issue(f.command, f.links, () => { throw new Error('uncertain'); })).toThrow('uncertain');
  expect(f.ledger.list(1)).toHaveLength(1);
});
test('reservations made after planning prevent overbooking before native invocation', () => {
  const f = fixture();
  f.ledger.reserve({ id: 'other', owner: 'haul', holder: 'unit', scope: 'task', expiresAt: 4,
    allocations: [{ pool: f.capacity('sink'), amount: 400 }] }, { [f.capacity('sink')]: 800 }, 1);
  expect(f.reservations.issue(f.command, f.links, () => { throw new Error('must not invoke'); })).toBe(false);
  expect(f.ledger.list(1)).toHaveLength(1);
});
