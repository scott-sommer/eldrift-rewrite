import { expect, test, vi } from 'vitest';
import { runConstructionCycle } from '../../src/features/construction/executor';
import { constructionTypeOrder } from '../../src/features/construction/order';
import type { ConstructionObservation } from '../../src/features/construction/model';
import type { PlanEntry } from '../../src/features/planning/plan-model';
const entries: PlanEntry[] = [20, 21].map(x => ({ type: 'rampart', x, y: 25, rcl: 6,
  minimumStoredEnergy: 50000, priority: 50, source: 'strategy' }));
const policy = { types: constructionTypeOrder }, budget = { entries: 10, attempts: 10 };
function observed(): ConstructionObservation {
  return { level: 6, storedEnergy: 50000, terrain: Array(2500).fill('plain'), objects: [], structures: [], sites: [],
    completed: new Set(), temporarilyOccupied: new Set(), limits: { rampart: Array(9).fill(2500) },
    globalSites: 0, globalSiteLimit: 100, roomSiteLimit: 1 };
}
test('accepted requests reserve capacity before sites become visible without mutating the plan', () => {
  const before = JSON.stringify(entries), create = vi.fn(() => ({ status: 'created' as const, reason: 'accepted' }));
  const result = runConstructionCycle(entries, { observe: observed, create }, policy, budget, () => true);
  expect(result.created).toBe(1);
  expect(create).toHaveBeenCalledTimes(1);
  expect(result.decisions[1]).toMatchObject({ status: 'waiting-for-budget', reason: 'site-limit' });
  expect(JSON.stringify(entries)).toBe(before);
});
test('observed accepted sites are not counted again by reservations', () => {
  const create = vi.fn(() => ({ status: 'created' as const, reason: 'accepted' }));
  const observe = () => ({ ...observed(), roomSiteLimit: 2, globalSiteLimit: 2,
    ...(create.mock.calls.length ? { globalSites: 1, sites: [{ id: 'site', ...entries[0]!, owned: true }] } : {}) });
  expect(runConstructionCycle(entries, { observe, create }, policy, budget, () => true).created).toBe(2);
});
test('reserve loss and downgrade between preparation and issuance prevent site calls', () => {
  for (const change of [{ storedEnergy: 49999 }, { level: 5 }]) {
    const observe = vi.fn().mockReturnValueOnce(observed()).mockImplementation(() => ({ ...observed(), ...change }));
    const create = vi.fn();
    expect(runConstructionCycle(entries, { observe, create }, policy, budget, () => true).created).toBe(0);
    expect(create).not.toHaveBeenCalled();
  }
});
test('full results stop the cycle; attempt budgets and admission refusal are exact', () => {
  const create = vi.fn(() => ({ status: 'full' as const, reason: 'global-limit' })), observe = vi.fn(observed);
  expect(runConstructionCycle(entries, { observe, create }, policy, budget, () => false).attempts).toBe(0);
  expect(observe).not.toHaveBeenCalled();
  expect(runConstructionCycle(entries, { observe, create }, policy, budget, () => true).attempts).toBe(1);
  create.mockReturnValue({ status: 'full', reason: 'global-limit' });
  expect(runConstructionCycle(entries, { observe, create }, policy, { entries: 10, attempts: 0 }, () => true).attempts).toBe(0);
});


test('bounded scans resume beyond completed prefixes and cycle back for later rebuilding', () => {
  const create = vi.fn(() => ({ status: 'created' as const, reason: 'accepted' }));
  const observe = () => ({ ...observed(), structures: [{ id: 'built', ...entries[0]!, owned: true }] });
  const first = runConstructionCycle(entries, { observe, create }, policy, { entries: 1, attempts: 1 }, () => true);
  expect(first.decisions[0]?.status).toBe('built');
  expect(first.next).toBe(1);
  const second = runConstructionCycle(entries, { observe, create }, policy, { entries: 1, attempts: 1, start: first.next }, () => true);
  expect(second.created).toBe(1);
  expect(second.next).toBe(0);
});
