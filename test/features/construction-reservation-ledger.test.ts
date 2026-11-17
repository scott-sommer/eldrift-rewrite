import { expect, test, vi } from 'vitest';
import { createConstructionReservationLedger, reservedConstructionPorts, constructionReservationKey } from '../../src/features/construction/reservation-ledger';
import { runConstructionCycle } from '../../src/features/construction/executor';
import { constructionTypeOrder } from '../../src/features/construction/order';
import type { ConstructionObservation } from '../../src/features/construction/model';
import type { PlanEntry } from '../../src/features/planning/plan-model';
const entry: PlanEntry = { type: 'rampart', x: 25, y: 25, rcl: 6, priority: 50, source: 'strategy' };
function observed(): ConstructionObservation {
  return { level: 6, storedEnergy: 50000, terrain: Array(2500).fill('plain'), objects: [], structures: [], sites: [],
    completed: new Set(), temporarilyOccupied: new Set(), limits: { rampart: Array(9).fill(2500) },
    globalSites: 0, globalSiteLimit: 1, roomSiteLimit: 2 };
}
test('two room cycles share global accepted capacity before native site visibility', () => {
  const ledger = createConstructionReservationLedger(), create = vi.fn(() => ({ status: 'created' as const, reason: 'accepted' }));
  const ports = (room: string) => reservedConstructionPorts(room, { observe: observed, create }, ledger, () => 1, () => new Set());
  const policy = { types: constructionTypeOrder }, budget = { entries: 10, attempts: 10 };
  expect(runConstructionCycle([entry], ports('W0N1'), policy, budget, () => true).created).toBe(1);
  const second = runConstructionCycle([entry], ports('W0N2'), policy, budget, () => true);
  expect(second.created).toBe(0);
  expect(second.decisions[0]?.reason).toBe('site-limit');
  expect(create).toHaveBeenCalledTimes(1);
});
test('visible sites deduplicate global counts and new ticks replace old intent reservations', () => {
  const ledger = createConstructionReservationLedger(), key = constructionReservationKey('W0N1', entry);
  ledger.accept(1, 'W0N1', entry);
  const visible = { ...observed(), sites: [{ id: 'site', ...entry, owned: true }] };
  expect(ledger.observe(1, 'W0N1', visible, new Set([key])).globalSites).toBe(1);
  expect(ledger.observe(1, 'W0N1', visible, new Set([key])).sites).toHaveLength(1);
  expect(ledger.observe(2, 'W0N2', observed(), new Set()).globalSites).toBe(0);
  expect(() => ledger.observe(1, 'W0N2', observed(), new Set())).toThrow('tick');
});
test('failed creates do not reserve and accepted metadata is detached from the adapter', () => {
  const ledger = createConstructionReservationLedger();
  const failed = reservedConstructionPorts('W0N1', { observe: observed,
    create: () => ({ status: 'retry', reason: 'occupied' }) }, ledger, () => 1, () => new Set());
  failed.create(entry);
  expect(failed.observe().globalSites).toBe(0);
  const accepted = reservedConstructionPorts('W0N1', { observe: observed, create(item) {
    item.x = 0; return { status: 'created', reason: 'accepted' };
  } }, ledger, () => 1, () => new Set());
  accepted.create(entry);
  expect(accepted.observe().sites[0]?.x).toBe(25);
  expect(entry.x).toBe(25);
});
