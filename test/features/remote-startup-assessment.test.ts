import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import type { StartupReturnPolicy } from '../../src/capabilities/economy/startup/assessment';
const policy: StartupReturnPolicy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 1000,maximumHouseholdCapital: 300 };
function fixture() {
  const input = startupDeliveryInput(), root = {};
  input.project.spawning.room = 'W0N1';
  input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,room: 'W0N1' }));
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: 'W0N1' }));
  input.project.spawning.cash.horizon = 1000;
  input.project.source.energy = 1000; input.project.source.capacity = 1000;
  const state = createMemoryPort(() => root), owner = createStartupPlanningJob(state,'W0N1');
  const request = { room: 'E0N1',source: 'source',generation: 1,binding: 'current',observedAt: 1,expiresAt: 100,tick: 1,expectedRevision: 0,input };
  return { root,state,owner,request };
}
test('completed profitable project assessment survives reset and changes policy without rewriting the forecast',() => {
  const f = fixture(); expect(f.owner.assess(f.request,policy)).toBeUndefined();
  f.owner.advance(f.request,50); expect(f.owner.assess(f.request,policy)).toBeUndefined();
  f.owner.advance({ ...f.request,expectedRevision: 1 },951);
  const root = JSON.parse(JSON.stringify(f.root)), owner = createStartupPlanningJob(createMemoryPort(() => root),'W0N1');
  const before = JSON.stringify(root), accepted = owner.assess(f.request,policy)!;
  expect(accepted).toMatchObject({ accepted: true,rejected: [],householdShortfall: 0,requiredHouseholdCapital: 300,horizon: 1000 });
  expect(accepted.recoveryMargin).toBeGreaterThan(0);
  expect(owner.assess(f.request,{ ...policy,minimumRecoveryMargin: accepted.recoveryMargin+1 })?.rejected).toEqual(['final-return']);
  expect(JSON.stringify(root)).toBe(before);
});
test('outside income cannot turn zero source deliveries into project recovery',() => {
  const f = fixture(); f.request.input.homeSink.freeCapacity = 0;
  f.request.input.project.spawning.cash.flows = [{ id: 'outside',kind: 'delivery',energy: 10000,firstTick: 20,interval: null,occurrences: 1 }];
  f.owner.advance(f.request,1001);
  expect(f.owner.assess(f.request,policy)).toMatchObject({ accepted: false,deliveredEnergy: 0,recoveryAt: null,rejected: ['delivery','recovery-deadline','final-return'] });
});
test('a first recovery crossing cannot hide a later source-attributed expense',() => {
  const f = fixture();
  f.request.input.project.spawning.cash.flows = [{ id: 'late-cost',kind: 'upkeep',energy: 10000,firstTick: 999,interval: null,occurrences: 1 }];
  f.owner.advance(f.request,1001);
  const assessment = f.owner.assess(f.request,{ ...policy,maximumHouseholdCapital: 100000 })!;
  expect(assessment.recoveryAt).not.toBeNull(); expect(assessment.recoveryMargin).toBeLessThan(0);
  expect(assessment.rejected).toEqual(['household-funding','final-return']);
});
test('capital and payback limits are independent of positive final return',() => {
  const f = fixture(); f.owner.advance(f.request,1001);
  const baseline = f.owner.assess(f.request,policy)!;
  expect(f.owner.assess(f.request,{ ...policy,maximumHouseholdCapital: 299,maximumRecoveryTicks: baseline.recoveryAt!-1 })?.rejected).toEqual(['capital-budget','recovery-deadline']);
});
test('unfunded source births fail without treating an unrelated household request as source service',() => {
  const f = fixture(); f.request.input.project.spawning.funding.initialEnergy = 0;
  f.owner.advance(f.request,1001);
  expect(f.owner.assess(f.request,policy)?.rejected).toEqual(['construction','service-birth','delivery','recovery-deadline','final-return']);
  const other = fixture(), birth = other.request.input.project.spawning.requests[0]!;
  other.request.input.project.spawning.requests = [...other.request.input.project.spawning.requests,{ ...birth,id: 'household',name: 'household',body: Array(50).fill('work'),priority: 9 }];
  other.owner.advance(other.request,1001); expect(other.owner.assess(other.request,policy)?.accepted).toBe(true);
});
test('stale context, input changes, expired observations and old clocks cannot reuse an assessment',() => {
  const f = fixture(); f.owner.advance({ ...f.request,tick: 5 },1001);
  for (const request of [{ ...f.request,tick: 4 },{ ...f.request,tick: 101 },{ ...f.request,tick: 5,binding: 'changed' }]) expect(f.owner.assess(request,policy)).toBeUndefined();
  f.request.input.project.source.energy = 0; expect(f.owner.assess({ ...f.request,tick: 5 },policy)).toBeUndefined();
});
test('invalid policy values and an impossible assessment deadline are refused',() => {
  const f = fixture();
  for (const value of [-1,NaN,Infinity,0.5]) expect(() => f.owner.assess(f.request,{ ...policy,minimumRecoveryMargin: value })).toThrow('policy');
  f.owner.advance(f.request,1001);
  expect(() => f.owner.assess(f.request,{ ...policy,maximumRecoveryTicks: 1001 })).toThrow('horizon');
});
