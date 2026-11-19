import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createRemoteCapacityStore } from '../../src/features/remotes/capacity/store';
import { nextRemoteCapacity, supportedRemoteSources } from '../../src/features/remotes/capacity/policy';
import type { RemoteCapacityRecord } from '../../src/features/remotes/capacity/model';
const policy = { initial: 3,maximum: 8,interval: 1500,increaseAt: .75,decreaseAt: .9 };
const initial: RemoteCapacityRecord = { home: 'W0N1',revision: 0,clock: 0,supported: 3,evaluatedAt: null,observedLoad: null };
const report = (load: number,coverage = 1) => ({ load,coverage,busyTicks: 0,starvedTicks: 0,spawnCount: 1 });
test('initialization establishes a full interval before any capacity adjustment',() => {
  const first = nextRemoteCapacity(initial,1,6,report(0,0),policy)!;
  expect(first).toMatchObject({ supported: 3,evaluatedAt: 1,observedLoad: null });
  expect(nextRemoteCapacity(first,1500,6,report(0),policy)).toBeUndefined();
  expect(nextRemoteCapacity(first,1501,6,report(0,.999),policy)).toBeUndefined();
  expect(nextRemoteCapacity(first,1501,6,report(.75),policy)).toMatchObject({ supported: 4,evaluatedAt: 1501 });
});
test.each([[.75001,3],[.89999,3],[.9,2],[1,2]])('load %s produces supported sources %s',(load,supported) => {
  expect(nextRemoteCapacity({ ...initial,evaluatedAt: 1 },1501,6,report(load),policy)).toMatchObject({ supported });
});
test('capacity never crosses zero or configured maximum',() => {
  expect(nextRemoteCapacity({ ...initial,supported: 0,evaluatedAt: 1 },1501,6,report(1),policy)?.supported).toBe(0);
  expect(nextRemoteCapacity({ ...initial,supported: 8,evaluatedAt: 1 },1501,6,report(0),policy)?.supported).toBe(8);
});
test('legacy controller-level getter remains distinct from stored adaptive capacity',() => {
  const record = { ...initial,supported: 7 };
  expect([2,3,4].map(level => supportedRemoteSources(record,level,8))).toEqual([2,3,7]);
  expect(supportedRemoteSources(record,4,4)).toBe(4);
  expect(nextRemoteCapacity(initial,1,2,report(0),policy)).toBeUndefined();
  expect(nextRemoteCapacity({ ...initial,clock: 9 },8,6,report(0),policy)).toBeUndefined();
});
test.each([NaN,Infinity,-1,1.1])('invalid load %s is rejected',(load) => {
  expect(() => nextRemoteCapacity(initial,1,6,report(load),policy)).toThrow();
});
test('capacity state is detached, fenced by revision and clock, and isolated by home',() => {
  const state = createMemoryPort(() => root), root = {}, store = createRemoteCapacityStore(state,'W0N1');
  expect(store.read()).toEqual(initial); expect(root).toEqual({});
  expect(store.save(0,{ ...initial,clock: 1,evaluatedAt: 1 })).toBe(true);
  store.read().supported = 99;
  expect(store.read().supported).toBe(3);
  expect(store.save(0,{ ...initial,clock: 2 })).toBe(false);
  expect(store.save(1,initial)).toBe(false);
  expect(createRemoteCapacityStore(state,'W0N2').read()).toMatchObject({ revision: 0,home: 'W0N2' });
});
test('corrupt capacity state is refused without replacing it',() => {
  const root = {}, state = createMemoryPort(() => root);
  state.write('remoteCapacity/W0N1',{ owner: 'remotes',version: 1,data: { ...initial,observedLoad: 2 } });
  const before = JSON.stringify(root);
  expect(() => createRemoteCapacityStore(state,'W0N1').read()).toThrow(); expect(JSON.stringify(root)).toBe(before);
});

test('a home without physical spawns cannot increase its source allowance from zero load',() => {
  expect(nextRemoteCapacity({ ...initial,evaluatedAt: 1 },1501,6,{ ...report(0),spawnCount: 0 },policy)).toBeUndefined();
});
