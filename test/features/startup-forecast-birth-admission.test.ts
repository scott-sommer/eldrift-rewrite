import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupForecastAdmission } from '../../src/features/remotes/startup/candidates/birth-admission';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 1000,maximumHouseholdCapital: 1000 };
function fixture(complete = true, marked = false) {
  const root = {}, state = createMemoryPort(() => root), home = 'W0N1', input = startupDeliveryInput();
  input.project.spawning.room = home;
  input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,room: home }));
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  input.project.spawning.cash.horizon = 1000; input.project.source.energy = 1000; input.project.source.capacity = 1000;
  const query = { room: 'E0N1',source: 'source',generation: 1,binding: 'current-config-world',observedAt: 1,expiresAt: 100,tick: 1,input };
  if (marked) input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,admission: { kind: 'remote-startup',generation: 1,observedAt: 1 } }));
  if (complete) createStartupPlanningJob(state,home).advance({ ...query,expectedRevision: 0 },1001);
  const proposed = input.project.spawning.requests[0]!, request = { ...proposed,readyAt: 1,expiresAt: 101 };
  const profile: RemoteFleetProfile = { home,room: query.room,source: query.source,generation: 1,owner: request.owner,body: [...request.body],kind: 'miner',desired: 1,travelTicks: 0,marginTicks: 0,retireTicks: 10,priority: 0 };
  return { root,state,home,query,request,profile,current: { query,policy,binding: query.binding,tick: 1 },admit: createStartupForecastAdmission(state,home) };
}
test('accepted completed cohort admits its exact current paid-birth slot without writes, including after reset',() => {
  const f = fixture(), before = JSON.stringify(f.root);
  expect(f.admit(f.profile,f.request,f.current)).toBe(true);
  const restored = JSON.parse(before);
  expect(createStartupForecastAdmission(createMemoryPort(() => restored),f.home)(f.profile,f.request,f.current)).toBe(true);
  expect(JSON.stringify(f.root)).toBe(before); expect(JSON.stringify(restored)).toBe(before);
});
test('incomplete evidence, rejected current return policy, changed binding and stale slot refuse',() => {
  const missing = fixture(false); expect(missing.admit(missing.profile,missing.request,missing.current)).toBe(false); expect(missing.root).toEqual({});
  const f = fixture();
  expect(f.admit(f.profile,f.request,{ ...f.current,policy: { ...policy,minimumRecoveryMargin: 100000 } })).toBe(false);
  expect(f.admit(f.profile,f.request,{ ...f.current,binding: 'changed-config' })).toBe(false);
  expect(f.admit(f.profile,f.request,{ ...f.current,tick: 2,query: { ...f.query,tick: 2 } })).toBe(false);
  expect(f.admit({ ...f.profile,generation: 2 },f.request,f.current)).toBe(false);
});
test('a different queued request, expiry, body, owner or population home cannot borrow the approved slot',() => {
  const f = fixture();
  for (const change of [{ id: 'other' },{ expiresAt: 102 },{ body: ['move'] as const },{ owner: 'other' },{ home: 'W1N1' }]) {
    expect(f.admit(f.profile,{ ...f.request,...change },f.current)).toBe(false);
  }
});

test('later slots require every earlier modeled birth with matching actual identity and clocks',() => {
  const f = fixture(), planned = f.query.input.project.spawning.requests[1]!;
  const request = { ...planned,readyAt: 1,expiresAt: 101 }, query = { ...f.query,tick: 10 };
  const profile = { ...f.profile,owner: request.owner,kind: 'courier' as const,body: [...request.body] };
  const current = { ...f.current,query,tick: 10 };
  expect(f.admit(profile,request,current)).toBe(false);
  const prior = { request: f.request.id,owner: f.request.owner,home: f.home,body: f.request.body,startAt: 1,activeAt: 10 };
  expect(f.admit(profile,request,{ ...current,births: [prior] })).toBe(true);
  expect(f.admit(profile,request,{ ...current,births: [{ ...prior,activeAt: 11 }] })).toBe(false);
});

test('a persisted cohort tag must name the approval generation and observation epoch',() => {
  const f = fixture(true,true); expect(f.admit(f.profile,f.request,f.current)).toBe(true);
  for (const admission of [{ kind: 'remote-startup' as const,generation: 2,observedAt: 1 },{ kind: 'remote-startup' as const,generation: 1,observedAt: 0 }]) {
    expect(f.admit(f.profile,{ ...f.request,admission },f.current)).toBe(false);
  }
});
