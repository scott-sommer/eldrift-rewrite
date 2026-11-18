import { expect, test, vi } from 'vitest';
import { createRemoteInfrastructureExecution } from '../../src/features/remotes/infrastructure/execution';
import type { ConstructionObservation } from '../../src/features/construction/model';
import { infrastructureFixture } from '../fixtures/remote-infrastructure';
function observed(): ConstructionObservation {
  return { level: 0,stageLevel: 1,storedEnergy: 0,terrain: Array(2500).fill('plain'),objects: [],structures: [],sites: [],
    completed: new Set(),temporarilyOccupied: new Set(),limits: { road: Array(9).fill(2500),container: Array(9).fill(5) },
    globalSites: 0,globalSiteLimit: 100,roomSiteLimit: 10 };
}
test('global entry/attempt budgets rotate room service and preserve owned planning/progress records', () => {
  const f = infrastructureFixture(); f.store.save(0,f.demand,f.draft,1);
  let tick = 1;
  const create = vi.fn(() => ({ status: 'created' as const,reason: 'accepted' }));
  const run = () => createRemoteInfrastructureExecution(f.state,'W0N1',{ clock: () => tick,guard: () => true,admit: () => true,
    construction: () => ({ observe: observed,create }) }).run(f.demand,{ rooms: 2,entries: 1,attempts: 1 });
  expect(run()[0]?.room).toBe('W0N1'); tick = 2; expect(run()[0]?.room).toBe('E0N1'); expect(create).toHaveBeenCalledTimes(2);
  expect(f.state.read('planning/W0N1')).toBeUndefined(); expect(f.state.read('construction/W0N1')).toBeUndefined();
});
test('revocation during a construction attempt stops subsequent effects and releases no unrelated state', () => {
  const f = infrastructureFixture(); f.store.save(0,f.demand,f.draft,1);
  const create = vi.fn(() => {
    f.assignments.reconcile({ home: 'W0N1',tick: 1,lifetime: 10,expectedRevision: 1,plans: [] });
    return { status: 'created' as const,reason: 'accepted' };
  });
  const service = createRemoteInfrastructureExecution(f.state,'W0N1',{ clock: () => 1,guard: () => true,admit: () => true,
    construction: () => ({ observe: observed,create }) });
  service.run(f.demand,{ rooms: 2,entries: 10,attempts: 10 }); expect(create).toHaveBeenCalledTimes(1);
  const before = JSON.stringify(f.root); expect(service.run(f.demand,{ rooms: 2,entries: 10,attempts: 10 })).toEqual([]); expect(JSON.stringify(f.root)).toBe(before);
});
test('unsafe or unowned admission and zero budgets produce no construction side effects', () => {
  const f = infrastructureFixture(); f.store.save(0,f.demand,f.draft,1);
  const construction = vi.fn();
  createRemoteInfrastructureExecution(f.state,'W0N1',{ clock: () => 1,guard: () => true,admit: () => false,construction })
    .run(f.demand,{ rooms: 2,entries: 10,attempts: 10 }); expect(construction).not.toHaveBeenCalled();
  createRemoteInfrastructureExecution(f.state,'W0N1',{ clock: () => 1,guard: () => true,admit: () => true,construction })
    .run(f.demand,{ rooms: 0,entries: 10,attempts: 10 }); expect(construction).not.toHaveBeenCalled();
});
