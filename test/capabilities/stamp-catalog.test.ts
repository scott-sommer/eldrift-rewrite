import { expect, test } from 'vitest';
import { createStampCatalog } from '../../src/capabilities/planning/stamp-catalog';
import { placeStamp } from '../../src/capabilities/planning/stamp-placement';
import { reactionGeometry } from '../../src/capabilities/planning/lab-geometry';
import { planningLimits } from '../fixtures/planning-limits';
import { planningObservation } from '../fixtures/planning-observation';
test('catalog stages complete service capacity without exceeding any controller level', () => {
  const stamps = createStampCatalog(planningLimits);
  expect(new Set(stamps.map(stamp => stamp.id)).size).toBe(stamps.length);
  const entries = stamps.flatMap(stamp => stamp.tiles);
  for (const type of ['spawn', 'extension', 'tower', 'lab', 'storage', 'terminal', 'factory', 'powerSpawn', 'nuker', 'observer'] as const) {
    expect(entries.filter(entry => entry.type === type)).toHaveLength(planningLimits[type][8]!);
    for (let rcl = 1; rcl <= 8; rcl++) {
      expect(entries.filter(entry => entry.type === type && entry.rcl <= rcl).length).toBeLessThanOrEqual(planningLimits[type][rcl]!);
    }
  }
});
test('every stamp admits all transforms with traversable connection ports', () => {
  for (const stamp of createStampCatalog(planningLimits)) {
    for (const transform of [0, 1, 2, 3, 4, 5, 6, 7] as const) {
      const result = placeStamp({ stamp, transform, anchor: { x: 25, y: 25 },
        entries: [], corridors: [], observation: planningObservation(),
        blocksMovement: type => type !== 'road' });
      expect(result.ok, stamp.id + ':' + transform).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      const labs = result.entries.filter(entry => entry.type === 'lab');
      if (labs.length) for (let rcl = 6; rcl <= 8; rcl++) {
        expect(reactionGeometry(labs.filter(entry => entry.rcl <= rcl).map(entry => entry.position))).toBeDefined();
      }
    }
  }
});
test('catalog calls are independent and invalid limits fail explicitly', () => {
  const first = createStampCatalog(planningLimits);
  first[0]!.tiles[0]!.offset.x = 99;
  expect(createStampCatalog(planningLimits)[0]!.tiles[0]!.offset.x).toBe(0);
  expect(() => createStampCatalog({ ...planningLimits, spawn: [0] })).toThrow('RCL');
});
