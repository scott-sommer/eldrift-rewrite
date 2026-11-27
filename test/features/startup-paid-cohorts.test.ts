import { encodeStartupPlanningInput } from '../../src/features/remotes/startup/planning/input';
import { afterEach,expect,test,vi } from 'vitest';
import { paidCohortFixture } from '../fixtures/startup-paid-cohorts';
import { qualifyPaidCohorts } from '../../src/features/remotes/startup/paid-cohorts';
import { sharedSinkCapacity,sharedCohortIdentity } from '../../src/capabilities/economy/startup/shared-validation';
import { createStartupProject,restoreStartupProject } from '../../src/capabilities/economy/startup/project';
import { snapshotStartupProject } from '../../src/capabilities/economy/startup/snapshot';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
afterEach(() => vi.unstubAllGlobals());
function project() {
  const f = paidCohortFixture(), shared = qualifyPaidCohorts(f.scope,f.workers,() => f.evidence,50)!;
  const input = startupDeliveryInput();
  input.project.spawning.room = f.home; input.project.spawning.cash.horizon = f.scope.horizon;
  input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,room: f.home }));
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: f.home }));
  input.homeSink = { capacity: 100000,freeCapacity: 100000-sharedSinkCapacity(shared),changes: [] }; input.shared = shared;
  return { ...f,input,shared };
}
test('full retained finance and actual paid lives reserve shared sink space without new birth costs or external income',() => {
  const f = project(), before = f.root();
  expect(f.shared.cohorts).toHaveLength(1); expect(f.shared.cohorts[0]!.workers).toHaveLength(2);
  expect(sharedSinkCapacity(f.shared)).toBe(f.workers.reduce((sum,worker) => sum+worker.body.filter(part => part.type === 'carry').length*50,0)*101);
  const current = createStartupProject(f.input); current.advance(101);
  const baseline = snapshotStartupProject(f.input); delete baseline.shared;
  const ordinary = createStartupProject(baseline); ordinary.advance(101);
  expect(current.result().cash).toEqual(ordinary.result().cash);
  expect(current.result().spawning.births.map(birth => birth.request)).not.toContain(f.workers[0]!.name);
  expect(f.root()).toBe(before);
});
test('unknown, stale, partial, changed and replacement-due cohorts cannot be discarded as free workforce',() => {
  for (const change of ['missing','current','owner','body','birth','partial','replacement','generation','demand']) {
    const f = paidCohortFixture();
    if (change === 'current') f.evidence.current = false;
    if (change === 'owner') f.workers[0]!.owner = 'unknown';
    if (change === 'body') f.workers[0]!.body[0]!.hits = 0;
    if (change === 'birth') f.evidence.births = f.evidence.births.map(birth => ({ ...birth,startAt: birth.startAt+1 }));
    if (change === 'partial') f.workers.pop();
    if (change === 'replacement') f.scope.horizon = 1500;
    if (change === 'generation') f.evidence.profiles = f.evidence.profiles.map(profile => ({ ...profile,generation: 2 }));
    if (change === 'demand') f.evidence.profiles = f.evidence.profiles.map(profile => ({ ...profile,desired: 2 }));
    expect(qualifyPaidCohorts(f.scope,f.workers,() => change === 'missing' ? undefined : f.evidence,50),change).toBeUndefined();
  }
});
test('elapsed observed lifetimes preserve exact commitments while current authority loss refuses them',() => {
  const f = paidCohortFixture(), first = qualifyPaidCohorts(f.scope,f.workers,() => f.evidence,50)!;
  f.workers.forEach(worker => worker.ticksToLive!--);
  expect(qualifyPaidCohorts(f.scope,f.workers,() => f.evidence,51)).toEqual(first);
  f.evidence.current = false; expect(qualifyPaidCohorts(f.scope,f.workers,() => f.evidence,51)).toBeUndefined();
});
test('shared checkpoints round-trip without relabeling or aliasing and reject changed sink/lifetime liabilities',() => {
  const f = project(), model = createStartupProject(f.input); model.advance(11);
  const saved = JSON.parse(JSON.stringify(model.checkpoint())); expect(saved.format).toBe(8);
  const wire = encodeStartupPlanningInput(f.input);
  expect(sharedCohortIdentity(wire.shared!.cohorts)).toBe(sharedCohortIdentity(f.shared.cohorts));
  const restored = restoreStartupProject(f.input,saved); expect(restored.checkpoint()).toEqual(saved);
  restored.advance(90); model.advance(90); expect(restored.result()).toEqual(model.result());
  expect(() => restoreStartupProject(f.input,{ ...saved,format: 7 })).toThrow();
  const copied = snapshotStartupProject(f.input); copied.shared!.cohorts[0]!.workers[0]!.body[0] = 'move';
  expect(copied.shared).not.toEqual(f.input.shared);
  const sink = snapshotStartupProject(f.input); sink.shared!.cohorts[0]!.sinkCapacity = 0;
  expect(() => createStartupProject(sink)).toThrow();
  const lifetime = snapshotStartupProject(f.input); lifetime.shared!.cohorts[0]!.workers[0]!.retireAt = 60;
  expect(() => createStartupProject(lifetime)).toThrow();
});

test('shared liabilities bind the planning source and observation rather than only a portable input hash',() => {
  const f = project(), query = { room: f.scope.room,source: f.scope.source,generation: 1,binding: 'shared-test',observedAt: 50,expiresAt: 150,tick: 50,input: f.input };
  expect(f.planner.advance({ ...query,expectedRevision: f.planner.read().revision },1).frames).toBe(1);
  expect(f.planner.read().job!.checkpoint.format).toBe(8);
  const changed = project(), before = changed.root();
  expect(() => changed.planner.advance({ ...query,source: 'different-source',expectedRevision: changed.planner.read().revision },1)).toThrow();
  expect(changed.root()).toBe(before);
});
