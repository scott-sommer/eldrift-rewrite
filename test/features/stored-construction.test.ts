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
  const service = () => createStoredConstructionCycle(store, () => plan, { observe, create }, { types: constructionTypeOrder });
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
  }, { observe: f.observe, create: f.create }, { types: constructionTypeOrder });
  expect(service.advance({ entries: 10, attempts: 10 }, () => true).status).toBe('stale');
  expect(f.create).not.toHaveBeenCalled();
  expect(f.store.read().revision).toBe(0);
  expect(f.store.save(0, 'request', 1).ok).toBe(true);
  expect(f.store.save(0, 'other', 2).ok).toBe(false);
});
