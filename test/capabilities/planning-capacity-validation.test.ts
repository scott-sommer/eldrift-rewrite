import { expect, test } from 'vitest';
import { validateLayoutCapacity } from '../../src/capabilities/planning/capacity-validation';
const limits = { link: [0, 0, 0, 0, 0, 2, 3, 4, 6], spawn: [0, 1, 1, 1, 1, 1, 1, 2, 3] };
test('individually valid infrastructure modules can exceed combined stage capacity', () => {
  const entries = [20, 21, 22].map(x => ({ type: 'link', position: { x, y: 25 }, rcl: 5 }));
  expect(validateLayoutCapacity(entries.slice(0, 1), limits)).toEqual([]);
  expect(validateLayoutCapacity(entries.slice(1), limits)).toEqual([]);
  expect(validateLayoutCapacity(entries, limits))
    .toEqual([{ reason: 'capacity', type: 'link', rcl: 5, actual: 3, limit: 2 }]);
  expect(validateLayoutCapacity(entries.map((entry, index) => ({ ...entry, rcl: index === 2 ? 6 : 5 })), limits)).toEqual([]);
});
test('duplicate, unknown and invalid stage entries cannot escape validation', () => {
  const spawn = { type: 'spawn', position: { x: 25, y: 25 }, rcl: 1 };
  expect(validateLayoutCapacity([spawn, spawn], limits)).toContainEqual({ reason: 'duplicate', type: 'spawn', index: 1275 });
  expect(validateLayoutCapacity([{ ...spawn, type: 'unknown' }], limits)).toEqual([{ reason: 'unknown-type', type: 'unknown' }]);
  expect(validateLayoutCapacity([{ ...spawn, rcl: 9 }], limits)).toEqual([{ reason: 'invalid-rcl', type: 'spawn', rcl: 9 }]);
  expect(validateLayoutCapacity([{ ...spawn, type: 'toString' }], limits)).toEqual([{ reason: 'unknown-type', type: 'toString' }]);
});
test('same-tile distinct types are counted independently; sharing legality is a separate validator', () => {
  const position = { x: 25, y: 25 };
  expect(validateLayoutCapacity([{ type: 'road', position, rcl: 4 }, { type: 'lab', position, rcl: 6 }], {
    road: [0, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500], lab: [0, 0, 0, 0, 0, 0, 3, 6, 10],
  })).toEqual([]);
});
