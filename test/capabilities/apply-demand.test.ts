import { expect, test } from 'vitest';
import { applyPopulationDemand } from '../../src/features/population/apply-demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import type { Envelope } from '../../src/persistence/versioned-state';
test('repeated demand planning preserves pending identities and replaces aging units without name reuse', () => {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const plan = { owner: 'mining:source-a', room: 'W0N0', desired: 1, replacementParts: 1, travelTicks: 2,
    marginTicks: 1, body: ['move' as const], priority: 0, requestLifetime: 20 };
  const first = applyPopulationDemand(port, plan, [], 1).created[0]!;
  expect(applyPopulationDemand(port, plan, [], 1).created).toEqual([]);
  expect(applyPopulationDemand(port, plan, [], 2).created).toEqual([]);
  const unit = { name: first, owner: plan.owner, room: plan.room, spawning: false, ticksToLive: 100 };
  expect(applyPopulationDemand(port, plan, [unit], 3).cancel).toEqual([first]);
  expect(createSpawnQueue(port, plan.room).list()).toEqual([]);
  const next = applyPopulationDemand(port, plan, [{ ...unit, ticksToLive: 6 }], 4).created[0]!;
  expect(next).not.toBe(first);
  expect(applyPopulationDemand(port, plan, [{ ...unit, ticksToLive: 5 }], 5).created).toEqual([]);
  applyPopulationDemand(port, { ...plan, desired: 0 }, [unit], 6);
  expect(createSpawnQueue(port, plan.room).list()).toEqual([]);
  const remote = applyPopulationDemand(port, { ...plan, room: 'E0N0' }, [], 6).created[0]!;
  expect(remote).not.toBe(first);
});

test('invalid replacement plans cannot cancel existing demand or partially fill a queue', () => {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const plan = { owner: 'mining:source-a', room: 'W0N0', desired: 1, replacementParts: 1, travelTicks: 2,
    marginTicks: 1, body: ['move' as const], priority: 0, requestLifetime: 20 };
  applyPopulationDemand(port, plan, [], 1);
  const before = JSON.stringify([...records]);
  expect(() => applyPopulationDemand(port, { ...plan, desired: 0, priority: NaN }, [], 2)).toThrow('identity');
  expect(JSON.stringify([...records])).toBe(before);
  expect(() => applyPopulationDemand(port, { ...plan, desired: 201 }, [], 2)).toThrow('capacity');
  expect(JSON.stringify([...records])).toBe(before);
});
