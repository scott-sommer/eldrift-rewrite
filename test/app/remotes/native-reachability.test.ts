import { afterEach, expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createNativeRemoteReachabilityFeature } from '../../../src/app/remotes/reachability/feature';
import { createRemoteReachabilityStore } from '../../../src/features/remotes/reachability/store';
import { createRemoteAssignmentStore } from '../../../src/features/remotes/assignment-store';
import { createRemoteFleetStore } from '../../../src/features/remotes/fleet/store';
import { remoteFleetOwner } from '../../../src/features/remotes/fleet/identity';
import { reservationOwner } from '../../../src/features/remotes/reservation/identity';
import { createSpawnQueue } from '../../../src/features/population/spawn-queue';
import { createRuntime } from '../../../src/app/runtime';
import { excludeUnreachableRooms, admitReachableRemoteSpawn } from '../../../src/app/remotes/reachability/policy';
import type { createNativeDispatch } from '../../../src/app/native-dispatch';
import type { RemoteFleetProfile } from '../../../src/features/remotes/fleet/model';
import { managementFixture } from '../../fixtures/remote-management';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const root = {}, state = createMemoryPort(() => root), assignments = createRemoteAssignmentStore(state);
  assignments.reconcile({ home: 'W0N1',tick: 1,expectedRevision: 0,lifetime: 100,plans: [{ room: 'E0N1',sources: ['source'],reserve: null,infrastructure: null }] });
  assignments.reconcile({ home: 'W1N1',tick: 1,expectedRevision: 1,lifetime: 100,plans: [{ room: 'E1N1',sources: ['other'],reserve: null,infrastructure: null }] });
  const profile: RemoteFleetProfile = { home: 'W0N1',room: 'E0N1',source: 'source',kind: 'miner',owner: '',generation: 1,body: ['work','carry','move'],desired: 1,travelTicks: 1,marginTicks: 1,retireTicks: 2,priority: 1 };
  profile.owner = remoteFleetOwner(profile); createRemoteFleetStore(state,'W0N1').save(0,1,[profile]);
  const game = { time: 1,creeps: {} as Record<string,Creep>,spawns: {} as Record<string,StructureSpawn>,getObjectById: vi.fn(() => null) }; vi.stubGlobal('Game',game);
  vi.stubGlobal('CLAIM','claim'); vi.stubGlobal('CREEP_CLAIM_LIFE_TIME',3); vi.stubGlobal('CREEP_LIFE_TIME',5);
  const dispatch = { activate: vi.fn(),structures: { cancelSpawning: vi.fn(() => 0) } } as unknown as ReturnType<typeof createNativeDispatch>;
  const reportFailure = vi.fn(), feature = createNativeRemoteReachabilityFeature(state,dispatch);
  const runtime = () => createRuntime([feature],{
    observations: { visibleRooms: () => ['W0N1'],observeRoom: name => ({ name,owned: true,units: [],structures: [] }) },
    config: () => ({ empire: { remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteWorkerCpuBudget: 0,remoteCpuBudget: 0,backgroundEnabled: false } }),
    clock: () => ({ tick: game.time,tickLimit: 100,bucket: 0 }),usedCpu: () => 0,reportFailure,
  });
  function creep(name: string,spawning: boolean,ttl: number) {
    return { name,id: name,my: true,spawning,ticksToLive: ttl,memory: { population: { home: 'W0N1',owner: profile.owner } },hits: 300,hitsMax: 300,
      body: profile.body.map(type => ({ type,hits: 100 })),getActiveBodyparts: () => 1,pos: { inRangeTo: () => false } } as unknown as Creep;
  }
  return { root,state,assignments,profile,game,dispatch,reportFailure,runtime,creep };
}
test('default-off registration reads neither native globals nor state',() => {
  const state = { read: vi.fn(),write: vi.fn() }, runtime = createRuntime([createNativeRemoteReachabilityFeature(state,{} as ReturnType<typeof createNativeDispatch>)],{
    observations: { visibleRooms: () => ['W0N1'],observeRoom: name => ({ name,owned: true,units: [],structures: [] }) },config: () => ({}),
    clock: () => ({ tick: 1,tickLimit: 100,bucket: 10000 }),usedCpu: () => 0,reportFailure: vi.fn(),
  });
  expect(runtime.tick().failures).toEqual([]); expect(state.read).not.toHaveBeenCalled(); expect(state.write).not.toHaveBeenCalled();
});
test('zero actor/discovery budgets and runtime reloads cannot suppress the final lifetime observation',() => {
  const f = fixture(), queue = createSpawnQueue(f.state,'W0N1');
  queue.submit({ id: 'unrelated',name: 'unrelated',owner: 'unrelated',room: 'W0N1',readyAt: 1,expiresAt: 100,priority: 1,body: ['move'] });
  const foreign = f.assignments.owner('E1N1',1);
  for (const [start,name] of [[1,'a'],[6,'b']] as const) {
    for (let age = 0; age <= 4; age++) {
      f.game.time = start+age; f.game.creeps = { [name]: f.creep(name,age === 0,age === 0 ? 0 : 5-age) };
      f.runtime().tick();
    }
  }
  expect(createRemoteReachabilityStore(f.state,'W0N1').read().blocked).toEqual([{ room: 'E0N1',source: 'source',tick: 10 }]);
  expect(f.assignments.owner('E0N1',10)).toBeUndefined(); expect(f.assignments.owner('E1N1',10)).toEqual(foreign);
  const request = { ...queue.list()[0]!,owner: f.profile.owner };
  expect(admitReachableRemoteSpawn(f.state,request)).toBe(false);
  expect(admitReachableRemoteSpawn(f.state,{ ...request,owner: remoteFleetOwner({ ...f.profile,home: 'W1N1' }) })).toBe(true);
  const input = managementFixture().request;
  expect(excludeUnreachableRooms(f.state,input).policy.candidates).toEqual([]); expect(input.policy.candidates).toHaveLength(1);
  expect(queue.list().map(item => item.id)).toEqual(['unrelated']); expect(f.reportFailure).not.toHaveBeenCalled();
});
test('permanent exclusions cancel only matching home and room families, including in-flight births',() => {
  const f = fixture(), store = createRemoteReachabilityStore(f.state,'W0N1');
  for (const [start,name] of [[1,'a'],[6,'b']] as const) {
    for (let age = 0; age <= 4; age++) store.observe(store.read().revision,start+age,[{ name,id: name,room: 'E0N1',source: 'source',spawning: age === 0,ttl: age === 0 ? 0 : 5-age,lifetime: 5,reached: false,eligible: true,healthy: true }]);
  }
  const owner = reservationOwner({ home: 'W0N1',room: 'E0N1',generation: 1 }), queue = createSpawnQueue(f.state,'W0N1');
  for (const [id,population] of [['blocked',owner],['foreign',reservationOwner({ home: 'W1N1',room: 'E0N1',generation: 1 })],['unrelated','unrelated']]) queue.submit({ id: id!,name: id!,owner: population!,room: 'W0N1',body: ['move'],priority: 1,readyAt: 1,expiresAt: 100 });
  f.game.creeps = { child: { memory: { population: { home: 'W0N1',owner } } } as Creep };
  const spawn = { room: { name: 'W0N1' },spawning: { name: 'child' } } as StructureSpawn; f.game.spawns = { Spawn: spawn };
  f.game.time = 11; f.runtime().tick();
  expect(queue.list().map(item => item.id)).toEqual(['foreign','unrelated']);
  expect(f.dispatch.structures.cancelSpawning).toHaveBeenCalledWith(spawn,'child',owner); expect(f.dispatch.activate).toHaveBeenCalled(); expect(f.reportFailure).not.toHaveBeenCalled();
});
