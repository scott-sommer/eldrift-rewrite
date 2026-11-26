import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupApprovals } from '../../src/features/remotes/startup/approvals/catalog';
import { createStartupForecastAdmission } from '../../src/features/remotes/startup/candidates/birth-admission';
import { remoteFleetOwner } from '../../src/features/remotes/fleet/identity';
import { startupTravelLegs } from '../../src/features/remotes/startup/travel-plan';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import { startupTravelPlan } from '../fixtures/startup-travel';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 1000,maximumHouseholdCapital: 1000 };
function fixture(complete = true) {
  const root = {}, state = createMemoryPort(() => root), plan = startupTravelPlan(), home = plan.home, input = startupDeliveryInput();
  input.project.spawning.room = home; input.project.spawning.cash.horizon = 1000; input.project.source.energy = 1000; input.project.source.capacity = 1000;
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,id: plan.spawn.id,room: home }));
  input.project.spawning.requests = input.project.spawning.requests.map((request,index) => ({ ...request,room: home,owner: remoteFleetOwner({ ...plan,kind: index === 0 ? 'miner' : 'courier' }),placement: { spawn: plan.spawn.id,exit: { ...plan.spawn.exit } } }));
  plan.miner = [...input.project.spawning.requests[0]!.body]; plan.courier = [...input.project.spawning.requests[1]!.body];
  const quote = { status: 'complete' as const,identity: JSON.stringify([plan,'measured']),plan,operations: 5,legs: startupTravelLegs(plan).map(leg => ({ kind: leg.kind,ticks: leg.kind === 'miner-approach' ? 0 : 1,operations: 1,arrival: { ...leg.destination } })) };
  const query = { room: plan.room,source: plan.source,generation: 1,binding: 'current-world',observedAt: 1,expiresAt: 100,tick: 1,input };
  const planner = createStartupPlanningJob(state,home), approvals = createStartupApprovals(state,home), proposal = { query,quote,rooms: [home,plan.room],policy };
  if (complete) planner.advance({ ...query,expectedRevision: 0 },1001);
  return { root,state,home,query,quote,planner,approvals,proposal };
}
test('missing/incomplete/rejected evidence cannot initialize approved storage',() => {
  const f = fixture(false); expect(f.approvals.capture(f.proposal,0)).toBe('unavailable'); expect(f.root).toEqual({});
  f.planner.advance({ ...f.query,expectedRevision: 0 },10); expect(f.approvals.capture(f.proposal,0)).toBe('unavailable');
  expect(f.state.read('remoteStartupApprovals/'+f.home)).toBeUndefined();
  const full = fixture(); expect(full.approvals.capture({ ...full.proposal,policy: { ...policy,minimumRecoveryMargin: 100000 } },0)).toBe('rejected'); expect(full.state.read('remoteStartupApprovals/'+full.home)).toBeUndefined();
});
test('approved checkpoint survives scratch replacement and JSON reset, admitting its later exact slot without writes',() => {
  const f = fixture(); expect(f.approvals.capture(f.proposal,0)).toBe('saved');
  f.planner.advance({ ...f.query,source: 'other',binding: 'other',tick: 2,expectedRevision: 1 },1001);
  const root = JSON.parse(JSON.stringify(f.root)), state = createMemoryPort(() => root), approvals = createStartupApprovals(state,f.home), before = JSON.stringify(root);
  const query = { ...f.query,tick: 10 }, proposed = query.input.project.spawning.requests[1]!, miner = query.input.project.spawning.requests[0]!;
  expect(createStartupPlanningJob(state,f.home).result(query)).toBeUndefined(); expect(approvals.result(query)?.projectCash.deliveredEnergy).toBeGreaterThan(0);
  const profile: RemoteFleetProfile = { home: f.home,room: query.room,source: query.source,generation: 1,kind: 'courier',owner: proposed.owner,body: [...proposed.body],desired: 1,travelTicks: 1,marginTicks: 0,retireTicks: 10,priority: proposed.priority };
  expect(createStartupForecastAdmission(state,f.home,approvals.result)(profile,{ ...proposed,readyAt: 1,expiresAt: 101 },{ query,policy,binding: query.binding,tick: 10,births: [{ request: miner.id,owner: miner.owner,home: f.home,body: miner.body,startAt: 1,activeAt: 10 }] })).toBe(true);
  expect(JSON.stringify(root)).toBe(before);
});
test('current query changes, stale writers and wrong-generation withdrawal preserve approved evidence',() => {
  const f = fixture(); f.approvals.capture(f.proposal,0); const before = JSON.stringify(f.root);
  expect(f.approvals.result({ ...f.query,binding: 'changed' })).toBeUndefined(); expect(f.approvals.result({ ...f.query,tick: 101 })).toBeUndefined();
  expect(f.approvals.capture(f.proposal,0)).toBe('conflict'); expect(f.approvals.withdraw(1,1,{ room: f.query.room,source: f.query.source,generation: 2 })).toBe(false); expect(JSON.stringify(f.root)).toBe(before);
  expect(f.approvals.withdraw(1,1,{ room: f.query.room,source: f.query.source,generation: 1 })).toBe(true); expect(f.approvals.result(f.query)).toBeUndefined();
});
test('detached geometry and strict completed checkpoint validation prevent corrupt retained approvals',() => {
  const f = fixture(); f.approvals.capture(f.proposal,0); const found = f.approvals.lookup(f.query)!; found.quote.plan.station.x = 1;
  expect(f.approvals.lookup(f.query)!.quote.plan.station.x).toBe(5);
  const raw = f.state.read('remoteStartupApprovals/'+f.home) as { version: number; owner: string; data: { approvals: { job: { checkpoint: { tick: number } } }[] } };
  raw.data.approvals[0]!.job.checkpoint.tick = 0; f.state.write('remoteStartupApprovals/'+f.home,raw);
  expect(() => f.approvals.read()).toThrow('invalid state data');
});

test('retained route/body/clock evidence cannot underprice the selected geometry',() => {
  const f = fixture(); f.quote.legs[0]!.ticks = 1;
  expect(() => f.approvals.capture(f.proposal,0)).toThrow('Invalid completed startup approval');
  expect(f.state.read('remoteStartupApprovals/'+f.home)).toBeUndefined();
});
