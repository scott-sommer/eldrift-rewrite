import { createIntelStore } from '../../src/features/intel/store';
import { intelSummary } from '../fixtures/intel-summary';
import { afterEach, expect, test, vi } from 'vitest';
import { createNativeScouts } from '../../src/app/native-scouts';
import { nativeScoutPorts } from '../../src/app/native-scout-ports';
import { createScoutControlStore } from '../../src/features/intel/scout-control-store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { resolveConfig } from '../../src/config/resolve';
import type { FeatureContext } from '../../src/app/runtime-model';
vi.mock('../../src/app/native-scout-ports',() => ({ nativeScoutPorts: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });
function context(tick: number, patch = {}): FeatureContext {
  const room = { name: 'W0N1', owned: true, units: [], structures: [], ownUnits: [], allies: [], threats: [], structuresByType: new Map() };
  return { room, world: { tick, rooms: new Map([[room.name,room]]), ownedRooms: [room], failures: [] },
    config: resolveConfig({ empire: patch },tick) };
}
function creep(id: string) {
  return { id, name: id, spawning: false, ticksToLive: 100, fatigue: 0, pos: { roomName: 'W0N1', x: 20, y: 20 },
    memory: { population: { owner: 'scout:W0N1', home: 'W0N1' } } } as unknown as Creep;
}
function setup(patch = {}) {
  const memory = {}, state = createMemoryPort(() => memory), used = { value: 0 };
  const game = { time: 1, creeps: {} as Record<string,Creep>, cpu: { tickLimit: 100, bucket: 10000, getUsed: () => used.value }, rooms: {} as Record<string,unknown> };
  vi.stubGlobal('Game',game);
  const config = () => resolveConfig({ empire: patch },game.time).values;
  const dispatch = { activate: vi.fn(), movement: { move: vi.fn(() => ({ status: 'running' as const })) } }, reportFailure = vi.fn();
  const work = createNativeScouts(state,dispatch,config,{ reportFailure });
  return { memory, state, game, used, work, dispatch, reportFailure };
}

test('default-disabled and zero-budget scouts do not create feature records or native movement', () => {
  for (const patch of [{},{ scoutsEnabled: true, scoutControlCpuBudget: 0 }]) {
    const fixture = setup(patch); fixture.game.creeps = { unit: creep('unit') };
    fixture.work.feature.run(context(1,patch)); fixture.work.demand.run(context(1,patch));
    expect(fixture.memory).toEqual({});
    expect(nativeScoutPorts).not.toHaveBeenCalled();
  }
});

test('disabling demand cancels only scout-owned pending requests on that tick', () => {
  const fixture = setup();
  fixture.game.rooms.W0N1 = { name: 'W0N1', controller: { my: true } };
  const queue = createSpawnQueue(fixture.state,'W0N1');
  for (const [id,owner] of [['scout','scout:W0N1'],['keep','mining:source']]) queue.submit({ id: id!, name: id!, owner: owner!,
    room: 'W0N1', readyAt: 0, expiresAt: 100, body: ['move'], priority: 1 });
  fixture.work.demand.run(context(1));
  expect(queue.list().map(request => request.id)).toEqual(['keep']);
});

test('oldest execution checkpoint receives the next limited unit slot across ticks', () => {
  const fixture = setup({ scoutsEnabled: true, scoutControlCpuBudget: 1 });
  fixture.game.creeps = { a: creep('a'), b: creep('b') };
  vi.mocked(nativeScoutPorts).mockImplementation(() => {
    fixture.used.value = 2;
    return { dangerous: false, ports: { next: () => undefined, capture: () => {}, failure: () => {}, escape: () => undefined,
      stabilize: () => ({ status: 'running' }), travel: () => ({ status: 'running' }) } };
  });
  fixture.work.feature.run(context(1));
  expect(createScoutControlStore(fixture.state).read().units.map(unit => unit.id)).toEqual(['a']);
  fixture.game.time = 2; fixture.used.value = 0;
  fixture.work.feature.run(context(2));
  expect(createScoutControlStore(fixture.state).read().units.map(unit => unit.id)).toEqual(['a','b']);
});

test('a failing unit and reporting sink cannot monopolize the next unit slot', () => {
  const fixture = setup({ scoutsEnabled: true, scoutControlCpuBudget: 1 });
  fixture.game.creeps = { a: creep('a'), b: creep('b') };
  fixture.reportFailure.mockImplementation(() => { throw new Error('sink'); });
  vi.mocked(nativeScoutPorts).mockImplementation((_state,_dispatch,unit) => {
    fixture.used.value = 2;
    if (unit.id === 'a') throw new Error('unit boundary');
    return { dangerous: false, ports: { next: () => undefined, capture: () => {}, failure: () => {}, escape: () => undefined,
      stabilize: () => ({ status: 'running' }), travel: () => ({ status: 'running' }) } };
  });
  fixture.work.feature.run(context(1));
  fixture.game.time = 2; fixture.used.value = 0;
  fixture.work.feature.run(context(2));
  expect(vi.mocked(nativeScoutPorts).mock.calls.map(call => call[2].id)).toEqual(['a','b']);
});


test('legacy RCL2 recruitment gate does not create a scout request at RCL1', () => {
  const patch = { scoutsEnabled: true, scoutSpawningEnabled: true, scoutAssignedRooms: ['E0N1'] };
  const fixture = setup(patch);
  fixture.game.rooms.W0N1 = { name: 'W0N1', controller: { my: true, level: 1 } };
  fixture.work.demand.run(context(1,patch));
  expect(createSpawnQueue(fixture.state,'W0N1').list()).toEqual([]);
});


test('newly hostile assigned rooms cancel pending scout demand without affecting another owner', () => {
  const patch = { scoutsEnabled: true, scoutSpawningEnabled: true, scoutAssignedRooms: ['E0N1'], scoutDepth: 0, scoutExtendedDepth: 0 };
  const fixture = setup(patch);
  fixture.game.rooms.W0N1 = { name: 'W0N1', controller: { my: true, level: 2, owner: { username: 'bot' } } };
  Object.assign(fixture.game,{ map: { getRoomStatus: () => ({ status: 'normal' }), describeExits: () => ({}) } });
  const facts = intelSummary(1,'E0N1'); facts.controller = { ...facts.controller!, owned: false, owner: 'enemy' };
  facts.units = []; facts.structures = [];
  createIntelStore(fixture.state).observeSummary(facts);
  const queue = createSpawnQueue(fixture.state,'W0N1');
  for (const [id,owner] of [['scout','scout:W0N1'],['keep','mining:source']]) queue.submit({ id: id!, name: id!, owner: owner!,
    room: 'W0N1', readyAt: 0, expiresAt: 100, body: ['move'], priority: 1 });
  fixture.work.demand.run(context(1,patch));
  expect(queue.list().map(request => request.id)).toEqual(['keep']);
});

test.each([{ scoutPlanCpuBudget: 0 },{ backgroundEnabled: false }])('paused assessment preserves live demand and removes expired own requests: %j', paused => {
  const patch = { scoutsEnabled: true, scoutSpawningEnabled: true, scoutAssignedRooms: ['E0N1'], ...paused };
  const fixture = setup(patch);
  fixture.game.rooms.W0N1 = { name: 'W0N1', controller: { my: true, level: 2, owner: { username: 'bot' } } };
  const queue = createSpawnQueue(fixture.state,'W0N1');
  for (const [id,expiresAt] of [['live',100],['expired',1]] as const) queue.submit({ id, name: id, owner: 'scout:W0N1',
    room: 'W0N1', readyAt: 0, expiresAt, body: ['move'], priority: 1 });
  fixture.work.demand.run(context(1,patch));
  expect(queue.list().map(request => request.id)).toEqual(['live']);
  expect(fixture.dispatch.activate).not.toHaveBeenCalled();
});
