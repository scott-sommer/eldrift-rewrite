import { expect, test } from 'vitest';
import { stageStandardCore } from '../../src/capabilities/planning/standard-core';
const limits = {
  spawn: [0, 1, 1, 1, 1, 1, 1, 2, 3], extension: [0, 0, 5, 10, 20, 30, 40, 50, 60],
  tower: [0, 0, 0, 1, 1, 2, 2, 3, 6], lab: [0, 0, 0, 0, 0, 0, 3, 6, 10],
  storage: [0, 0, 0, 0, 1, 1, 1, 1, 1], terminal: [0, 0, 0, 0, 0, 0, 1, 1, 1],
  link: [0, 0, 0, 0, 0, 2, 3, 4, 6], powerSpawn: [0, 0, 0, 0, 0, 0, 0, 0, 1],
  nuker: [0, 0, 0, 0, 0, 0, 0, 0, 1], observer: [0, 0, 0, 0, 0, 0, 0, 0, 1],
  road: [0, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500],
};
test('standard core stages all placements, preserves priorities, and fits every injected RCL limit', () => {
  const core = stageStandardCore({ x: 25, y: 25 }, 0, limits)!;
  expect(core).toHaveLength(128);
  expect(core.filter(entry => entry.rcl === 1)).toHaveLength(1);
  expect(core.find(entry => entry.type === 'storage')).toMatchObject({ rcl: 4, priority: -500 });
  expect(core.find(entry => entry.type === 'link')).toMatchObject({ rcl: 5, priority: -365, tag: 'storage' });
  expect(core.filter(entry => entry.type === 'road').every(entry => entry.rcl === 4)).toBe(true);
  for (const [type, capacity] of Object.entries(limits)) for (let rcl = 1; rcl <= 8; rcl++) {
    expect(core.filter(entry => entry.type === type && entry.rcl <= rcl).length).toBeLessThanOrEqual(capacity[rcl]!);
  }
  expect(JSON.parse(JSON.stringify(core))).toEqual(core);
});
test('invalid footprint and missing structure limits cannot produce a partial core', () => {
  expect(stageStandardCore({ x: 2, y: 2 }, 0, limits)).toBeUndefined();
  expect(() => stageStandardCore({ x: 25, y: 25 }, 0, {})).toThrow('Missing structure limits');
});
