import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupSelections } from '../../src/features/remotes/startup/selection-store';
import { createStartupTravel } from '../../src/features/remotes/startup/travel';
import { startupTravelPlan } from '../fixtures/startup-travel';
import type { CompleteStartupTravel } from '../../src/features/remotes/startup/selection-model';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
function fixture() {
  const root = {},state = createMemoryPort(() => root), plan = startupTravelPlan(), store = createStartupSelections(state,plan.home);
  const measure = (input = plan) => {
    const result = createStartupTravel(state,plan.home,request => ({ status: 'complete',ticks: 10,operations: 20,arrival: { ...request.destination } }))(input,'static-route-v1',1,5,() => true);
    if (result.status !== 'complete') throw new Error('Expected complete quote');
    return result;
  };
  const quote = measure();
  const profile: RemoteFleetProfile = { home: plan.home,room: plan.room,source: plan.source,kind: 'miner',generation: 1,owner: 'fixture',body: [...plan.miner],desired: 1,travelTicks: 10,marginTicks: 5,retireTicks: 20,priority: 1 };
  const proposal = { generation: 1,binding: 'policy-topology-v1',expiresAt: 100,quote };
  return { root,state,plan,quote,profile,proposal,store,measure };
}
test('empty selection lookup is detached and does not initialize memory',() => {
  const root = {},state = createMemoryPort(() => root), store = createStartupSelections(state,'W0N1');
  expect(store.read()).toEqual({ revision: 0,clock: 0,selections: [] }); expect(root).toEqual({});
  expect(() => createStartupSelections(state,'bad')).toThrow('home');
});
test('complete evidence survives JSON reset and serves both exact ordered cohort bodies',() => {
  const f = fixture(); expect(f.store.publish(0,2,f.proposal)).toBe(true); f.quote.plan.spawn.exit.x = 1;
  const root = JSON.parse(JSON.stringify(f.root)), state = createMemoryPort(() => root), store = createStartupSelections(state,f.plan.home);
  const miner = store.lookup(f.profile,f.proposal.binding,3); expect(miner?.quote.plan.spawn.exit.x).toBe(46);
  const courier = { ...f.profile,kind: 'courier' as const,body: [...f.plan.courier] };
  expect(store.lookup(courier,f.proposal.binding,3)?.quote.plan.courier).toEqual(f.plan.courier);
  miner!.quote.plan.spawn.exit.x = 2; expect(store.lookup(f.profile,f.proposal.binding,3)?.quote.plan.spawn.exit.x).toBe(46);
});
test('generation, body order, source, home and fresh context each fence reuse without writes',() => {
  const f = fixture(); f.store.publish(0,2,f.proposal); const before = JSON.stringify(f.root);
  for (const change of [{ generation: 2 },{ body: [...f.profile.body].reverse() },{ source: 'other' },{ room: 'E1N1' },{ home: 'W1N1' }]) {
    expect(f.store.lookup({ ...f.profile,...change },f.proposal.binding,3)).toBeUndefined();
  }
  expect(f.store.lookup(f.profile,'policy-topology-v2',3)).toBeUndefined(); expect(JSON.stringify(f.root)).toBe(before);
});
test('expiry is inclusive and reads cannot resurrect future or backwards-clock evidence',() => {
  const f = fixture(); f.store.publish(0,2,f.proposal);
  expect(f.store.lookup(f.profile,f.proposal.binding,100)).toBeDefined(); expect(f.store.lookup(f.profile,f.proposal.binding,101)).toBeUndefined();
  expect(f.store.lookup(f.profile,f.proposal.binding,1)).toBeUndefined();
  f.store.withdraw(1,20,{ room: 'E1N1',source: 'absent' }); expect(f.store.lookup(f.profile,f.proposal.binding,19)).toBeUndefined();
});
test('stale writers and older observations cannot overwrite a newer selection',() => {
  const f = fixture(); f.store.publish(0,3,f.proposal); const before = JSON.stringify(f.root);
  expect(f.store.publish(0,4,{ ...f.proposal,binding: 'new' })).toBe(false);
  expect(f.store.publish(1,2,{ ...f.proposal,binding: 'old' })).toBe(false);
  expect(f.store.withdraw(0,4,f.profile)).toBe(false); expect(JSON.stringify(f.root)).toBe(before);
});
test('replacement and withdrawal are source scoped and preserve other owners and homes',() => {
  const f = fixture(); f.state.write('fixture/sentinel',{ owner: 'fixture',version: 1,data: { keep: 42 } }); f.store.publish(0,2,f.proposal);
  const other = { ...f.plan,source: 'second' }; f.store.publish(1,3,{ ...f.proposal,quote: f.measure(other) });
  const moved = startupTravelPlan(); moved.spawn.exit.y--; f.store.publish(2,4,{ ...f.proposal,quote: f.measure(moved) });
  expect(f.store.read().selections).toHaveLength(2); expect(f.store.lookup(f.profile,f.proposal.binding,4)?.quote.plan.spawn.exit.y).toBe(24);
  expect(f.store.withdraw(3,5,f.profile)).toBe(true); expect(f.store.read().selections.map(item => item.quote.plan.source)).toEqual(['second']);
  expect(createStartupSelections(f.state,'W1N1').read().selections).toEqual([]); expect(f.state.read('fixture/sentinel')).toMatchObject({ data: { keep: 42 } });
});
test('unfinished or inconsistent geometric evidence never initializes a selection record',() => {
  const f = fixture(); const before = JSON.stringify(f.root);
  const bad: CompleteStartupTravel[] = [
    { ...f.quote,status: 'deferred' } as unknown as CompleteStartupTravel,
    { ...f.quote,legs: f.quote.legs.slice(0,4) },{ ...f.quote,operations: 1 },{ ...f.quote,identity: 'broken' },
    { ...f.quote,legs: f.quote.legs.map((leg,index) => index ? leg : { ...leg,arrival: { ...leg.arrival,x: 1 } }) },
    { ...f.quote,plan: { ...f.quote.plan,source: 'unquoted' } },
  ];
  for (const quote of bad) expect(() => f.store.publish(0,2,{ ...f.proposal,quote })).toThrow('geometry selection');
  expect(JSON.stringify(f.root)).toBe(before);
});
test('invalid selection clocks, identity bounds and generation are refused before writes',() => {
  const f = fixture(), before = JSON.stringify(f.root);
  for (const change of [{ generation: 0 },{ binding: '' },{ binding: 'x'.repeat(8193) },{ expiresAt: 1 },{ expiresAt: 10003 }]) {
    expect(() => f.store.publish(0,2,{ ...f.proposal,...change })).toThrow('geometry selection');
  }
  expect(() => f.store.publish(0,-1,f.proposal)).toThrow('tick'); expect(JSON.stringify(f.root)).toBe(before);
});
test.each(['owner','version','data'])('corrupt or incompatible %s envelopes fail closed without replacement',field => {
  const f = fixture(); f.store.publish(0,2,f.proposal);
  const raw = f.state.read('remoteStartupSelections/W0N1') as { owner: string; version: number; data: unknown };
  if (field === 'owner') raw.owner = 'other'; if (field === 'version') raw.version = 2; if (field === 'data') raw.data = {};
  f.state.write('remoteStartupSelections/W0N1',raw); const before = JSON.stringify(f.root);
  expect(() => f.store.lookup(f.profile,f.proposal.binding,3)).toThrow(); expect(JSON.stringify(f.root)).toBe(before);
});
test('bounded record refuses capacity growth without evicting live selections and reclaims expired evidence',() => {
  const f = fixture(); let count = 0;
  for (let index = 0; index < 128; index++) {
    const quote = f.measure({ ...f.plan,source: 'source-'+index });
    if (!f.store.publish(count,2,{ ...f.proposal,binding: 'x'.repeat(8192),quote })) break;
    count++;
  }
  expect(count).toBeGreaterThan(1); expect(count).toBeLessThan(128); const before = JSON.stringify(f.root);
  expect(f.store.publish(count,2,{ ...f.proposal,binding: 'x'.repeat(8192) })).toBe(false); expect(JSON.stringify(f.root)).toBe(before);
  expect(f.store.publish(count,101,{ ...f.proposal,expiresAt: 200 })).toBe(true);
  expect(f.store.read().selections).toHaveLength(1); expect(f.store.lookup(f.profile,f.proposal.binding,101)).toBeDefined();
});
