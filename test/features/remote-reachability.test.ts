import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createRemoteReachabilityStore } from '../../src/features/remotes/reachability/store';
import type { ReachabilityObservation } from '../../src/features/remotes/reachability/model';
function unit(overrides: Partial<ReachabilityObservation> = {}): ReachabilityObservation {
  return { name: 'miner',id: 'id',room: 'E0N1',source: 'source',spawning: false,ttl: 4,lifetime: 5,reached: false,eligible: true,healthy: true,...overrides };
}
function fixture(home = 'W0N1') {
  const root = {}, state = createMemoryPort(() => root), store = createRemoteReachabilityStore(state,home);
  const observe = (tick: number,units: ReachabilityObservation[]) => store.observe(store.read().revision,tick,units);
  return { root,state,store,observe };
}
function failedLife(f: ReturnType<typeof fixture>, start: number, id: string) {
  f.observe(start,[unit({ id,name: id,spawning: true,ttl: 0 })]);
  for (let age = 1; age <= 4; age++) f.observe(start+age,[unit({ id,name: id,ttl: 5-age })]);
}
test('two complete never-arrived lifetimes block source and room once for one home',() => {
  const f = fixture(); failedLife(f,1,'a');
  expect(f.store.read()).toMatchObject({ sources: [{ consecutiveFailures: 1,lastResult: 'failure',reportedAt: 5,blockedAt: null }],blocked: [] });
  failedLife(f,6,'b');
  expect(f.store.read()).toMatchObject({ sources: [{ consecutiveFailures: 2,blockedAt: 10 }],blocked: [{ room: 'E0N1',source: 'source',tick: 10 }] });
  expect(f.observe(10,[unit({ id: 'b',name: 'b',ttl: 1 })])).toBe(false);
  expect(createRemoteReachabilityStore(f.state,'W1N1').read().blocked).toEqual([]);
});
test('actual arrival is positive evidence once and clears a failure streak even for an older miner',() => {
  const f = fixture(); failedLife(f,1,'a');
  f.observe(6,[unit({ id: 'b',ttl: 2,reached: true })]);
  f.observe(7,[unit({ id: 'b',ttl: 1,reached: true })]);
  expect(f.store.read().sources).toMatchObject([{ consecutiveFailures: 0,lastResult: 'success',reportedAt: 6 }]);
  failedLife(f,8,'c'); expect(f.store.read().blocked).toEqual([]);
});
test.each(['healthy','eligible'] as const)('loss of %s interrupts a lifetime even if later restored',(field) => {
  const f = fixture(); f.observe(1,[unit({ spawning: true,ttl: 0 })]);
  f.observe(2,[unit({ [field]: false })]);
  f.observe(3,[unit({ ttl: 3 })]); f.observe(4,[unit({ ttl: 2 })]); f.observe(5,[unit({ ttl: 1 })]);
  expect(f.store.read().sources).toEqual([]); expect(f.store.read().attempts[0]?.phase).toBe('interrupted');
});
test('early disappearance, missing final observation and untracked older miners never imply failure',() => {
  const f = fixture(); f.observe(1,[unit({ spawning: true,ttl: 0 })]); f.observe(2,[unit()]);
  f.observe(3,[]); expect(f.store.read().attempts).toEqual([]); expect(f.store.read().sources).toEqual([]);
  f.observe(4,[unit({ ttl: 1 })]); expect(f.store.read().sources).toEqual([]);
  f.observe(5,[]); f.observe(6,[unit({ spawning: true,ttl: 0 })]); f.observe(7,[unit()]);
  f.observe(10,[unit({ ttl: 1 })]); expect(f.store.read().attempts[0]?.phase).toBe('interrupted'); expect(f.store.read().sources).toEqual([]);
});
test('TTL extensions, premature aging and skipped birth completion cannot become full-life failures',() => {
  for (const ttl of [1,2,3,5]) {
    const f = fixture(); f.observe(1,[unit({ spawning: true,ttl: 0 })]); f.observe(2,[unit({ ttl })]);
    f.observe(3,[unit({ ttl: 1 })]); expect(f.store.read().sources).toEqual([]);
  }
});
test('real-engine first-ready TTL1499 remains eligible when the spawning transition was observed',() => {
  const f = fixture();
  for (const [start,id] of [[1,'a'],[1501,'b']] as const) {
    f.observe(start,[unit({ id,name: id,spawning: true,ttl: 0,lifetime: 1500 })]);
    for (let age = 1; age <= 1499; age++) f.observe(start+age,[unit({ id,name: id,ttl: 1500-age,lifetime: 1500 })]);
  }
  expect(f.store.read().blocked).toEqual([{ room: 'E0N1',source: 'source',tick: 3000 }]);
});
test('a successful arrival does not silently remove a permanent blacklist',() => {
  const f = fixture(); failedLife(f,1,'a'); failedLife(f,6,'b');
  f.observe(11,[unit({ id: 'c',reached: true })]);
  expect(f.store.read().sources[0]).toMatchObject({ consecutiveFailures: 0,blockedAt: 10,lastResult: 'success' });
  expect(f.store.read().blocked).toHaveLength(1);
});
test('detached reads, reloads, revision fencing and clock fencing protect state',() => {
  const f = fixture(); expect(f.store.read().sources).toEqual([]); expect(f.root).toEqual({});
  f.observe(1,[unit({ spawning: true,ttl: 0 })]); const before = JSON.stringify(f.root);
  f.store.read().attempts[0]!.phase = 'failure'; expect(JSON.stringify(f.root)).toBe(before);
  expect(createRemoteReachabilityStore(f.state,'W0N1').read()).toEqual(f.store.read());
  expect(f.store.observe(0,2,[unit()])).toBe(false); expect(f.observe(0,[])).toBe(false); expect(JSON.stringify(f.root)).toBe(before);
});
test('identity changes cannot transfer an observed birth to another source',() => {
  const f = fixture(); f.observe(1,[unit({ spawning: true,ttl: 0 })]);
  f.observe(2,[unit({ source: 'other' })]); f.observe(3,[unit({ source: 'other',ttl: 1 })]);
  expect(f.store.read().sources).toEqual([]);
});
test('duplicate actors and invalid evidence are rejected without mutation',() => {
  const f = fixture(); expect(() => f.observe(1,[unit(),unit()])).toThrow('Duplicate'); expect(f.root).toEqual({});
  expect(() => f.observe(1,[unit({ room: 'W0N1' })])).toThrow('identity');
  expect(() => f.observe(1,[unit({ ttl: NaN })])).toThrow('lifetime'); expect(f.root).toEqual({});
});
test('corrupt blacklist provenance is rejected rather than turned into an empty history',() => {
  const f = fixture(); f.state.write('remoteReachability/W0N1',{ owner: 'remotes',version: 1,data: { ...f.store.read(),blocked: [{ room: 'E0N1',source: 'unknown',tick: 0 }] } });
  const before = JSON.stringify(f.root); expect(() => f.store.read()).toThrow(); expect(JSON.stringify(f.root)).toBe(before);
});

test('bounded history evicts only resolved safe entries and never forgets unresolved failures',() => {
  const safe = fixture();
  for (let tick = 1; tick <= 129; tick++) safe.observe(tick,[unit({ id: String(tick),source: String(tick),reached: true })]);
  expect(safe.store.read().sources).toHaveLength(128); expect(safe.store.read().sources.some(source => source.source === '1')).toBe(false);
  const failed = fixture();
  for (let index = 0; index < 128; index++) {
    const start = index*5+1;
    failed.observe(start,[unit({ id: String(index),source: String(index),spawning: true,ttl: 0 })]);
    for (let age = 1; age <= 4; age++) failed.observe(start+age,[unit({ id: String(index),source: String(index),ttl: 5-age })]);
  }
  const before = JSON.stringify(failed.root);
  expect(() => failed.observe(641,[unit({ id: 'new',source: 'new',reached: true })])).toThrow('source history capacity');
  expect(JSON.stringify(failed.root)).toBe(before);
});
