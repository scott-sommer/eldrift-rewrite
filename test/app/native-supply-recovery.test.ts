import { afterEach, expect, test, vi } from 'vitest';
import { createNativeSupplyRecovery } from '../../src/app/native-supply-recovery';
import type { createNativeDispatch } from '../../src/app/native-dispatch';
import type { FeatureContext } from '../../src/app/runtime-model';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { upgradeSupplyOwner } from '../../src/features/work/upgrade-supply';
import { defaults } from '../../src/config/model';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const memory = {};
  const state = createMemoryPort(() => memory);
  const sponsor = { name: 'W0N1', controller: { my: false } };
  const refuge = { name: 'E0N1', controller: { my: true } };
  const rooms: Record<string, unknown> = { W0N1: sponsor, E0N1: refuge };
  const creep = { id: 'courier', name: 'courier', my: true, spawning: false, room: refuge,
    pos: { x: 5, y: 5 }, memory: { population: { home: 'W0N1', owner: upgradeSupplyOwner('W0N1', 'E0N1') } } as CreepMemory,
    store: { getUsedCapacity: () => 0 } };
  vi.stubGlobal('Game', { time: 1, rooms, creeps: { courier: creep }, map: { getRoomLinearDistance: () => 1 } });
  const settings = { ...defaults, logisticsEnabled: false };
  const dispatch = { activate: vi.fn(), movement: { move: vi.fn() } } as unknown as ReturnType<typeof createNativeDispatch>;
  const feature = createNativeSupplyRecovery(state, dispatch, () => settings);
  const run = (name = 'E0N1') => feature.run({ room: { name } } as FeatureContext);
  return { state, rooms, creep, settings, run };
}
test('missing sponsor visibility never creates a loss marker or steals route ownership', () => {
  const f = fixture();
  delete f.rooms.W0N1;
  f.settings.logisticsEnabled = true;
  f.run();
  expect(f.creep.memory.upgradeSupplyRecovery).toBeUndefined();
  expect(f.creep.memory.population?.home).toBe('W0N1');
});
test('confirmed loss survives sponsor visibility loss and completes handoff only with eligible refuge', () => {
  const f = fixture();
  f.run();
  expect(f.creep.memory.upgradeSupplyRecovery?.sponsor).toBe('W0N1');
  delete f.rooms.W0N1;
  f.run();
  expect(f.creep.memory.population?.home).toBe('W0N1');
  f.settings.logisticsEnabled = true;
  f.run();
  expect(f.creep.memory.population).toEqual({ home: 'E0N1', owner: 'logistics:"E0N1"' });
  expect(f.creep.memory.upgradeSupplyRecovery).toBeUndefined();
});
test('visible lost sponsors cancel only their supply requests', () => {
  const f = fixture();
  const queue = createSpawnQueue(f.state, 'W0N1');
  const request = { id: 'supply', name: 'supply', room: 'W0N1', home: 'W0N1',
    owner: upgradeSupplyOwner('W0N1', 'E0N1'), body: ['move', 'carry'] as const, priority: 88, readyAt: 1, expiresAt: 100 };
  queue.submit(request);
  const unrelated = { ...request, id: 'mining', name: 'mining', owner: 'mining' };
  queue.submit(unrelated);
  f.run('W0N1');
  expect(queue.list()).toEqual([unrelated]);
});
