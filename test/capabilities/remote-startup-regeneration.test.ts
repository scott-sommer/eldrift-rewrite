import { expect, test } from 'vitest';
import { quoteStartupSpawnRegeneration } from '../../src/capabilities/economy/startup/energy/regeneration';
test('one frozen post-intent room snapshot allows multiple native spawn increments across the threshold',() => {
  const frame = { roomEnergy: 299,spawns: [{ id: 'a',energy: 150,eligible: true },{ id: 'b',energy: 149,eligible: true }] }, before = JSON.stringify(frame);
  expect(quoteStartupSpawnRegeneration(frame)).toMatchObject({ energy: 2,credits: [{ structure: 'a',energy: 1 },{ structure: 'b',energy: 1 }] }); expect(JSON.stringify(frame)).toBe(before);
  frame.roomEnergy = 300; expect(quoteStartupSpawnRegeneration(frame).energy).toBe(0);
});
test('unowned, over-limit or tutorial spawns need explicit ineligible facts even if room stock is low',() => {
  expect(quoteStartupSpawnRegeneration({ roomEnergy: 100,spawns: [{ id: 'eligible',energy: 100,eligible: true },{ id: 'excluded',energy: 0,eligible: false }] }).credits).toEqual([{ structure: 'eligible',energy: 1 }]);
});
test('impossible room snapshots, duplicate points and invalid stocks cannot manufacture ambient input',() => {
  expect(() => quoteStartupSpawnRegeneration({ roomEnergy: 99,spawns: [{ id: 'a',energy: 100,eligible: true }] })).toThrow('snapshot');
  expect(() => quoteStartupSpawnRegeneration({ roomEnergy: 0,spawns: [{ id: 'a',energy: 0,eligible: true },{ id: 'a',energy: 0,eligible: false }] })).toThrow('Duplicate');
  expect(() => quoteStartupSpawnRegeneration({ roomEnergy: 400,spawns: [{ id: 'a',energy: 301,eligible: true }] })).toThrow('stock');
});
