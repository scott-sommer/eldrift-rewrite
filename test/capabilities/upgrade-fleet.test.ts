import { expect, test } from 'vitest';
import { maintainUpgradeFleet } from '../../src/features/work/upgrade-fleet';
import { refreshUpgradeFleetGate } from '../../src/features/work/upgrade-fleet-gate';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { populationMemory } from '../../src/adapters/screeps/population';
import { upgradeOwner } from '../../src/features/work/upgrade-identity';
import { resolveConfig } from '../../src/config/resolve';
import type { Envelope } from '../../src/persistence/versioned-state';
function fixture() {
  const records = new Map<string, Envelope>();
  return { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
}
const plan = { home: 'W0N1', target: 'E0N1', desired: 7, enabled: true, body: ['work', 'carry', 'move'] as const };
test('strict spawning hysteresis persists across reconstruction and both equality boundaries', () => {
  const state = fixture();
  const run = (energy: number) => refreshUpgradeFleetGate(state, 'E0N1', energy, 10000000, 5000000);
  expect(run(10000000)).toBe(false);
  expect(run(10000001)).toBe(true);
  expect(run(10000000)).toBe(true);
  expect(run(5000000)).toBe(true);
  expect(run(4999999)).toBe(false);
  expect(run(5000000)).toBe(false);
  expect(() => refreshUpgradeFleetGate(state, 'E0N1', 1, 10, 10)).toThrow();
});
test('travel, spawning and low TTL count toward the seven stations; repeated ticks do not duplicate demand', () => {
  const state = fixture();
  const units = Array.from({ length: 6 }, (_, index) => ({ name: 'unit' + index, owner: upgradeOwner('E0N1'),
    room: 'E0N1', spawning: index === 0, ticksToLive: index }));
  maintainUpgradeFleet(state, plan, units, [], 1);
  maintainUpgradeFleet(state, plan, units, [], 2);
  const queue = createSpawnQueue(state, plan.home);
  expect(queue.list()).toHaveLength(1);
  const request = queue.list()[0]!;
  expect(request.room).toBe('W0N1');
  expect(request.home).toBe('E0N1');
  expect(populationMemory(request).population).toEqual({ owner: upgradeOwner('E0N1'), home: 'E0N1' });
  units.push({ ...units[0]!, name: request.name });
  maintainUpgradeFleet(state, plan, units, [], 3);
  expect(queue.list()).toEqual([]);
  units.pop();
  maintainUpgradeFleet(state, plan, units, [], 4);
  expect(queue.list()[0]!.name).not.toBe(request.name);
});
test('sponsor changes respect other queues and cancelling this scope preserves unrelated work', () => {
  const state = fixture();
  maintainUpgradeFleet(state, { ...plan, desired: 2 }, [], [], 1);
  const old = createSpawnQueue(state, 'W0N1');
  const newHome = { ...plan, home: 'W1N1', desired: 2 };
  maintainUpgradeFleet(state, newHome, [], old.list(), 1);
  expect(createSpawnQueue(state, 'W1N1').list()).toEqual([]);
  const unrelated = { ...old.list()[0]!, id: 'other', name: 'other', owner: 'mining' };
  old.submit(unrelated);
  maintainUpgradeFleet(state, { ...plan, enabled: false }, [], [], 2);
  expect(old.list()).toEqual([unrelated]);
  maintainUpgradeFleet(state, newHome, [], old.list(), 2);
  expect(createSpawnQueue(state, 'W1N1').list()).toHaveLength(2);
});
test('fleet configuration validates room identity, capacity and threshold ordering', () => {
  expect(resolveConfig({ roomOverride: { upgradeRoomSponsor: 'W0N1', upgradeFleetTarget: 0 } }, 1).values.upgradeRoomSponsor).toBe('W0N1');
  for (const patch of [{ upgradeRoomSponsor: 'bad' }, { upgradeFleetTarget: 8 }, { upgradeFleetStartEnergy: 5000000 },
    { upgradeFleetStopEnergy: -1 }, { upgradeFleetBodyBudget: 4601 }]) expect(() => resolveConfig({ roomOverride: patch }, 1)).toThrow();
  const state = fixture();
  expect(() => createSpawnQueue(state, 'W0N1').submit({ id: 'bad', name: 'bad', owner: 'test', room: 'W0N1', home: '',
    priority: 0, readyAt: 1, expiresAt: 10, body: ['move'] })).toThrow();
});
