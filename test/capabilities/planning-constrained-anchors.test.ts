import { expect, test } from 'vitest';
import { constrainedAnchors } from '../../src/capabilities/planning/constrained-anchors';
test('legacy search retains preference, center distance, controller distance and stable enumeration ties', () => {
  const result = constrainedAnchors({ controller: { x: 25, y: 25 }, preferred: [] });
  expect(result).toHaveLength(36);
  expect(result.slice(0, 9)).toEqual([
    { x: 25, y: 25 }, { x: 23, y: 25 }, { x: 25, y: 23 }, { x: 25, y: 27 }, { x: 27, y: 25 },
    { x: 23, y: 23 }, { x: 23, y: 27 }, { x: 27, y: 23 }, { x: 27, y: 27 },
  ]);
  expect(constrainedAnchors({ controller: { x: 0, y: 0 }, preferred: [], limit: 2 }))
    .toEqual([{ x: 25, y: 25 }, { x: 23, y: 23 }]);
});
test('existing anchors lead even off-grid, deduplicate, and do not leak references', () => {
  const preferred = [{ x: 3, y: 4 }, { x: 3, y: 4 }, { x: 25, y: 25 }];
  const result = constrainedAnchors({ controller: { x: 25, y: 25 }, preferred, limit: 2500 });
  expect(result).toHaveLength(257);
  expect(result.slice(0, 2)).toEqual([{ x: 25, y: 25 }, { x: 3, y: 4 }]);
  result[1]!.x = 9;
  expect(preferred[0]!.x).toBe(3);
});
test('bad controller coordinates and invalid search bounds fail explicitly', () => {
  expect(() => constrainedAnchors({ controller: { x: 50, y: 25 }, preferred: [] })).toThrow();
  for (const limit of [0, 2501, 1.5]) {
    expect(() => constrainedAnchors({ controller: { x: 25, y: 25 }, preferred: [], limit })).toThrow('limit');
  }
});
