import { expect, test } from 'vitest';
import { compileRemoteInfrastructure } from '../../src/features/remotes/infrastructure/plan';
import { infrastructureFixture } from '../fixtures/remote-infrastructure';
test('cross-room routes compile deterministic deduplicated roads and a separate container station', () => {
  const f = infrastructureFixture(), before = JSON.stringify(f.route);
  const result = compileRemoteInfrastructure(f.demand,[f.route,{ ...f.route,source: 'second' }],1);
  expect(result.plans.map(plan => plan.room)).toEqual(['E0N1','W0N1']);
  expect(result.plans.flatMap(plan => plan.entries)).toHaveLength(4);
  expect(result.stations).toHaveLength(2); expect(JSON.stringify(f.route)).toBe(before);
  const disabled = { ...f.demand,infrastructure: { roads: false,containers: true } };
  expect(compileRemoteInfrastructure(disabled,[f.route],1).plans.flatMap(plan => plan.entries).map(entry => entry.type)).toEqual(['container']);
});
test('discontinuous, nonadjacent, wrong-room and duplicate-source routes cannot become desired state', () => {
  const f = infrastructureFixture();
  for (const route of [{ ...f.route,path: [f.route.path[0]!,f.route.station] },{ ...f.route,station: { ...f.route.station,x: 8 } },
    { ...f.route,target: { ...f.route.target,room: 'E1N1' } }]) expect(() => compileRemoteInfrastructure(f.demand,[route],1)).toThrow('route');
  expect(() => compileRemoteInfrastructure(f.demand,[f.route,f.route],1)).toThrow('routes');
});
test('feature-owned drafts resume, fence revisions and reject changed source membership or revoked leases', () => {
  const f = infrastructureFixture(), before = JSON.stringify(f.root);
  expect(f.store.read().revision).toBe(0); expect(JSON.stringify(f.root)).toBe(before);
  expect(f.store.save(0,f.demand,{ ...f.draft,routes: [] },1).status).toBe('draft');
  expect(f.store.read().plans).toEqual([]);
  expect(f.store.save(0,f.demand,f.draft,2).status).toBe('conflict');
  expect(f.store.save(1,f.demand,{ ...f.draft,sources: ['other'] },2).status).toBe('sources-changed');
  expect(f.store.save(1,f.demand,f.draft,2).status).toBe('planned');
  const snapshot = f.store.read(); snapshot.plans[0]!.entries.length = 0; expect(f.store.read().plans[0]!.entries.length).toBeGreaterThan(0);
  f.assignments.reconcile({ home: 'W0N1',tick: 3,lifetime: 10,expectedRevision: 1,plans: [] });
  const saved = JSON.stringify(f.root); expect(f.store.save(2,f.demand,f.draft,3).status).toBe('revoked'); expect(JSON.stringify(f.root)).toBe(saved);
});

test('a new home owns a separate infrastructure record and cannot execute the previous home lease', () => {
  const f = infrastructureFixture(); f.store.save(0,f.demand,f.draft,1);
  const old = f.store.read();
  f.assignments.reconcile({ home: 'W0N1',tick: 2,lifetime: 10,expectedRevision: 1,plans: [] });
  f.assignments.reconcile({ home: 'W1N1',tick: 2,lifetime: 20,expectedRevision: 2,plans: f.plans });
  const lease = f.assignments.owner('E0N1',2)!;
  expect(lease.home).toBe('W1N1'); expect(f.store.save(old.revision,f.demand,f.draft,2).status).toBe('revoked');
  expect(f.store.read()).toEqual(old);
});
