import { afterEach, expect, test, vi } from 'vitest';
import { createNativeRemoteCapacityFeature, limitRemoteSources } from '../../../src/app/remotes/capacity/feature';
import { createNativeSpawnLoadObserver } from '../../../src/app/remotes/capacity/observer';
import { createRuntime } from '../../../src/app/runtime';
import { resolveConfig } from '../../../src/config/resolve';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createSpawnQueue } from '../../../src/features/population/spawn-queue';
import { createRemoteCapacityStore } from '../../../src/features/remotes/capacity/store';
import { createSpawnLoadStore } from '../../../src/features/population/spawn-load/store';
import { managementFixture } from '../../fixtures/remote-management';
afterEach(() => vi.unstubAllGlobals());
function fixture(enabled = true) {
  const root = {}, state = createMemoryPort(() => root), home = { name: 'W0N1',controller: { my: true,level: 6 },energyAvailable: 300,energyCapacityAvailable: 1300 } as Room;
  const spawn = { id: 'spawn',my: true,room: home,spawning: null,isActive: () => true };
  const game = { time: 1,rooms: { W0N1: home },creeps: {},spawns: { Spawn: spawn } }; vi.stubGlobal('Game',game);
  const config = resolveConfig({ empire: { remoteAdaptiveEnabled: enabled,backgroundEnabled: false,remoteCpuBudget: 0 } },1).values;
  const structures = { availableSpawn: vi.fn(() => true),availableEnergy: vi.fn((_home: string,energy: number) => energy) }, report = vi.fn();
  const observe = createNativeSpawnLoadObserver(state,structures,() => config,report);
  const runtime = createRuntime([createNativeRemoteCapacityFeature(state)],{
    observations: { visibleRooms: () => ['W0N1'],observeRoom: name => ({ name,owned: true,units: [],structures: [] }) },
    config: () => ({ empire: config }),clock: () => ({ tick: game.time,tickLimit: 100,bucket: 0 }),usedCpu: () => 0,reportFailure: report,
  });
  return { root,state,home,game,config,structures,report,observe,runtime };
}
test('default-off evaluator and observer leave new namespaces and ledger untouched',() => {
  const f = fixture(false); f.runtime.tick(); f.observe();
  expect(f.root).toEqual({}); expect(f.structures.availableSpawn).not.toHaveBeenCalled(); expect(f.report).not.toHaveBeenCalled();
  const policy = managementFixture().request.policy;
  expect(limitRemoteSources(f.state,f.home,policy,f.config)).toBe(policy); expect(f.root).toEqual({});
});
test('urgent evaluator uses a complete closed window even when background work is disabled',() => {
  const f = fixture();
  for (let tick = 1; tick <= 1501; tick++) {
    f.game.time = tick; f.runtime.tick();
    if (tick <= 1500) expect(createRemoteCapacityStore(f.state,'W0N1').read().supported).toBe(3);
    f.observe();
  }
  expect(createRemoteCapacityStore(f.state,'W0N1').read()).toMatchObject({ supported: 4,evaluatedAt: 1501,observedLoad: 0 });
  const policy = managementFixture().request.policy;
  expect(limitRemoteSources(f.state,f.home,policy,f.config).portfolio).toMatchObject({ maximumSources: 4,maximumSlots: policy.portfolio.maximumSlots });
  expect(f.report).not.toHaveBeenCalled();
});
test('observer reads the post-dispatch energy/structure ledger and retains skipped demand',() => {
  const f = fixture(), queue = createSpawnQueue(f.state,'W0N1');
  queue.submit({ id: 'waiting',owner: 'fixture',room: 'W0N1',name: 'waiting',priority: 1,readyAt: 1,expiresAt: 2000,body: ['claim','move'] });
  f.structures.availableEnergy.mockReturnValue(0); f.observe();
  expect(createSpawnLoadStore(f.state,'W0N1').report(1,1).starvedTicks).toBe(1);
  f.game.time = 2; f.structures.availableSpawn.mockReturnValue(false); f.observe();
  expect(createSpawnLoadStore(f.state,'W0N1').report(2,1)).toMatchObject({ busyTicks: 1,starvedTicks: 1 });
  expect(queue.list()).toHaveLength(1); expect(f.report).not.toHaveBeenCalled();
});
test('corrupt observation is reported and preserved rather than reset',() => {
  const f = fixture(); f.state.write('spawnLoad/W0N1',{ owner: 'population',version: 1,data: {} });
  const before = JSON.stringify(f.root); f.observe();
  expect(f.report).toHaveBeenCalledWith(expect.objectContaining({ id: 'spawn-load',room: 'W0N1' })); expect(JSON.stringify(f.root)).toBe(before);
});
