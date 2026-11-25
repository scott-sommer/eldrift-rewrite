import { createStartupCandidateStore } from '../../src/features/remotes/startup/candidates/store';
import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import type { StartupPlanningQuery } from '../../src/features/remotes/startup/planning/model';
const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 1000,maximumHouseholdCapital: 1000 };
function fixture() {
  const root = {}, state = createMemoryPort(() => root), home = 'W0N1', input = startupDeliveryInput();
  input.project.spawning.room = home;
  input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,room: home }));
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  input.project.spawning.cash.horizon = 1000; input.project.source.energy = 1000; input.project.source.capacity = 1000;
  const query: StartupPlanningQuery = { room: 'E0N1',source: 'source',generation: 1,binding: 'fresh',observedAt: 1,expiresAt: 100,tick: 1,input };
  return { root,state,home,query,planner: createStartupPlanningJob(state,home),catalog: createStartupCandidateCatalog(state,home) };
}
function completed() { const f = fixture(); f.planner.advance({ ...f.query,expectedRevision: 0 },1001); return f; }
test('absent/incomplete/expired forecasts cannot initialize a candidate catalog',() => {
  const f = fixture(); expect(f.catalog.lookup('a',f.query,policy)).toBeUndefined();
  expect(f.catalog.capture('a',f.query,policy,0)).toBe('unavailable'); expect(f.root).toEqual({});
  f.planner.advance({ ...f.query,expectedRevision: 0 },10);
  expect(f.catalog.capture('a',f.query,policy,0)).toBe('unavailable');
  expect(f.state.read('remoteStartupCandidates/W0N1')).toBeUndefined();
});
test('sequential scratch jobs retain both complete assessments across reset and choose without writes',() => {
  const f = completed(); expect(f.catalog.capture('a',f.query,policy,0)).toBe('saved');
  const second = { ...f.query,tick: 2,source: 'other',binding: 'other-plan' };
  f.planner.advance({ ...second,expectedRevision: 1 },1001);
  expect(f.catalog.capture('b',second,policy,1)).toBe('saved');
  expect(f.planner.assess({ ...f.query,tick: 2 },policy)).toBeUndefined();
  const root = JSON.parse(JSON.stringify(f.root)), catalog = createStartupCandidateCatalog(createMemoryPort(() => root),f.home), before = JSON.stringify(root);
  expect(catalog.choose([{ id: 'b',query: second },{ id: 'a',query: { ...f.query,tick: 2 } }],policy,'final-return')).toMatchObject({ status: 'complete',selected: 'a' });
  const assessment = catalog.lookup('a',{ ...f.query,tick: 2 },policy)!; assessment.rejected.push('construction');
  expect(catalog.lookup('a',{ ...f.query,tick: 2 },policy)?.rejected).toEqual([]); expect(JSON.stringify(root)).toBe(before);
});
test('a missing candidate defers the entire comparison rather than choosing the completed subset',() => {
  const f = completed(); f.catalog.capture('a',f.query,policy,0);
  expect(f.catalog.choose([{ id: 'a',query: f.query },{ id: 'b',query: f.query }],policy,'payback')).toEqual({ status: 'deferred',missing: ['b'] });
});
test('policy, context, source generation, observation and actual input changes invalidate captured evidence',() => {
  const f = completed(); f.catalog.capture('a',f.query,policy,0);
  for (const query of [{ ...f.query,binding: 'changed' },{ ...f.query,generation: 2 },{ ...f.query,observedAt: 2,tick: 2 },{ ...f.query,tick: 101 }]) expect(f.catalog.lookup('a',query,policy)).toBeUndefined();
  expect(f.catalog.lookup('a',f.query,{ ...policy,minimumDeliveredEnergy: 2 })).toBeUndefined();
  f.query.input.project.source.energy--;
  expect(f.catalog.lookup('a',f.query,policy)).toBeUndefined(); expect(f.catalog.capture('a',f.query,policy,1)).toBe('unavailable');
});
test('stale revisions and backwards clocks cannot overwrite or erase newer evidence',() => {
  const f = completed(); f.catalog.capture('a',{ ...f.query,tick: 5 },policy,0); const before = JSON.stringify(f.root);
  expect(f.catalog.capture('b',{ ...f.query,tick: 5 },policy,0)).toBe('conflict');
  expect(f.catalog.capture('b',f.query,policy,1)).toBe('conflict');
  expect(f.catalog.withdraw('a',0,5)).toBe('conflict'); expect(f.catalog.lookup('a',f.query,policy)).toBeUndefined(); expect(JSON.stringify(f.root)).toBe(before);
});
test('scoped withdrawal preserves other candidates and authoritative planning state',() => {
  const f = completed(); f.catalog.capture('a',f.query,policy,0); f.catalog.capture('b',f.query,policy,1);
  const planning = JSON.stringify(f.planner.read());
  expect(f.catalog.withdraw('a',2,2)).toBe('saved'); expect(f.catalog.read().entries.map(entry => entry.id)).toEqual(['b']);
  expect(JSON.stringify(f.planner.read())).toBe(planning);
});
test('bounded growth refuses excess entries and reclaims only expired evidence on a later capture',() => {
  const f = completed(); for (let i = 0; i < 16; i++) expect(f.catalog.capture(String(i),f.query,policy,i)).toBe('saved');
  const before = JSON.stringify(f.root); expect(f.catalog.capture('extra',f.query,policy,16)).toBe('capacity'); expect(JSON.stringify(f.root)).toBe(before);
  const next = { ...f.query,tick: 101,observedAt: 101,expiresAt: 200 };
  f.planner.advance({ ...next,expectedRevision: 1 },1001); expect(f.catalog.capture('new',next,policy,16)).toBe('saved'); expect(f.catalog.read().entries).toHaveLength(1);
});
test('foreign/future/corrupt candidate records fail closed and remain unchanged',() => {
  for (const alter of [(record: { owner: string }) => { record.owner = 'other'; },(record: { version: number }) => { record.version = 3; },(record: { data: unknown }) => { record.data = {}; }]) {
    const f = completed(); f.catalog.capture('a',f.query,policy,0);
    const key = 'remoteStartupCandidates/W0N1', raw = f.state.read(key) as { owner: string; version: number; data: unknown }; alter(raw); f.state.write(key,raw);
    const before = JSON.stringify(f.root); expect(() => f.catalog.lookup('a',f.query,policy)).toThrow(); expect(JSON.stringify(f.root)).toBe(before);
  }
});
test('comparison rejects duplicate IDs, mixed ticks/horizons and an invalid home',() => {
  const f = completed(); const a = { id: 'a',query: f.query };
  expect(() => f.catalog.choose([a,a],policy,'payback')).toThrow('choice');
  expect(() => f.catalog.choose([a,{ id: 'b',query: { ...f.query,tick: 2 } }],policy,'payback')).toThrow('frames');
  expect(() => createStartupCandidateCatalog(f.state,'home')).toThrow('home');
});

test('input and aggregate wire caps preserve the existing catalog on capacity refusal',() => {
  const f = completed(); f.catalog.capture('a',f.query,policy,0);
  const store = createStartupCandidateStore(f.state,f.home), entry = store.read().entries[0]!, before = JSON.stringify(f.root);
  expect(store.save(1,1,[{ ...entry,inputIdentity: 'x'.repeat(262145) }])).toBe('capacity');
  const entries = Array.from({ length: 5 },(_,index) => ({ ...entry,id: String(index),inputIdentity: 'x'.repeat(262144) }));
  expect(store.save(1,1,entries)).toBe('capacity'); expect(JSON.stringify(f.root)).toBe(before);
});
