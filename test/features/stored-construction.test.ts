import type { ConstructionExecutionPorts } from '../../src/features/construction/executor';
import { expect, test, vi } from 'vitest';
import { createConstructionProgressStore } from '../../src/features/construction/progress-store';
import { createStoredConstructionCycle } from '../../src/features/construction/stored-cycle';
import { constructionTypeOrder } from '../../src/features/construction/order';
import type { PlanState } from '../../src/features/planning/plan-model';
import type { ConstructionObservation } from '../../src/features/construction/model';
import type { Envelope } from '../../src/persistence/versioned-state';
function fixture() {
  const records: Record<string, Envelope> = {};
  const port = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  const plan: PlanState = { room: 'W0N1', revision: 1, strategy: 'standard', entries: [20, 21].map(x => ({
    type: 'road', x, y: 25, rcl: 1, priority: 1, source: 'strategy' })) };
  const observe = (): ConstructionObservation => ({ level: 6, storedEnergy: 50000,
    terrain: Array(2500).fill('plain'), objects: [], structures: [], sites: [], completed: new Set(), temporarilyOccupied: new Set(),
    limits: { road: Array(9).fill(2500) }, globalSites: 0, globalSiteLimit: 100, roomSiteLimit: 10 });
  const create = vi.fn<ConstructionExecutionPorts['create']>(() => ({ status: 'created' as const, reason: 'accepted' }));
  const store = createConstructionProgressStore(port, 'W0N1');
  const service = () => createStoredConstructionCycle(store, () => plan, { observe, create }, { types: constructionTypeOrder }, () => 1);
  return { records, port, plan, observe, create, store, service };
}
test('cursor survives service/store recreation and plan changes restart the ordered scan', () => {
  const f = fixture(), budget = { entries: 1, attempts: 1 };
  expect(f.service().advance(budget, () => false)).toEqual({ status: 'deferred' });
  expect(Object.keys(f.records)).toHaveLength(0);
  expect(f.service().advance(budget, () => true).status).toBe('advanced');
  expect(createConstructionProgressStore(f.port, 'W0N1').read().next).toBe(1);
  f.service().advance(budget, () => true);
  expect(f.create.mock.calls.map(call => (call[0] as { x: number }).x)).toEqual([20, 21]);
  f.plan.revision++;
  f.service().advance(budget, () => true);
  expect(f.create.mock.calls[2]?.[0]).toMatchObject({ x: 20 });
});
test('revision checks stop stale site requests and stale progress saves', () => {
  const f = fixture();
  let reads = 0;
  const service = createStoredConstructionCycle(f.store, () => {
    if (++reads === 2) f.plan.revision++;
    return f.plan;
  }, { observe: f.observe, create: f.create }, { types: constructionTypeOrder }, () => 1);
  expect(service.advance({ entries: 10, attempts: 10 }, () => true).status).toBe('stale');
  expect(f.create).not.toHaveBeenCalled();
  expect(f.store.read().revision).toBe(0);
  expect(f.store.save(0, 'request', 1).ok).toBe(true);
  expect(f.store.save(0, 'other', 2).ok).toBe(false);
});


test('persistent retry quarantine survives service recreation and resets for a revised desired plan', () => {
  const f = fixture();
  f.plan.entries = f.plan.entries.slice(0, 1);
  let tick = 1;
  f.create.mockReturnValue({ status: 'retry', reason: 'engine:-7' });
  const advance = () => createStoredConstructionCycle(f.store, () => f.plan,
    { observe: f.observe, create: f.create }, { types: constructionTypeOrder }, () => tick,
    { attempts: 2, delay: 2, maximumDelay: 4 }).advance({ entries: 1, attempts: 1 }, () => true);
  advance(); tick = 2; advance();
  expect(f.create).toHaveBeenCalledTimes(1);
  tick = 3; advance(); tick = 10; advance();
  expect(f.create).toHaveBeenCalledTimes(2);
  expect(Object.values(f.store.read().retries)[0]?.quarantined).toBe(true);
  f.plan.revision++; tick = 11;
  f.create.mockReturnValue({ status: 'created', reason: 'accepted' });
  advance();
  expect(f.create).toHaveBeenCalledTimes(3);
  expect(f.store.read().retries).toEqual({});
});
test('version1 progress upgrades with empty retry history and retains cursor authority', () => {
  const f = fixture();
  f.records['construction/W0N1'] = { owner: 'construction', version: 1,
    data: { room: 'W0N1', revision: 9, identity: 'legacy-request', next: 7 } };
  expect(f.store.read()).toEqual({ room: 'W0N1', revision: 9, identity: 'legacy-request', next: 7, retries: {} });
  expect(f.records['construction/W0N1']?.version).toBe(2);
});
