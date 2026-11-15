import { expect, test } from 'vitest';
import { scoreDistributorService } from '../../src/capabilities/planning/service-score';
import type { ServiceLayout } from '../../src/capabilities/planning/service-score';
const layout: ServiceLayout = {
  storage: { x: 20, y: 20 }, spawns: [{ x: 22, y: 21 }],
  extensions: [{ x: 25, y: 24 }], roads: [],
};
test('legacy spawn weight eight and Chebyshev service distance remain explicit', () => {
  expect(scoreDistributorService(layout)).toEqual({
    weight: 9, distanceCost: 210, roadCredit: 0, score: 99790,
  });
});
test('road adjacency is capped at three, deduplicated, and excludes the target tile', () => {
  const roads = [
    { x: 21, y: 20 }, { x: 22, y: 20 }, { x: 23, y: 20 }, { x: 23, y: 21 },
    { x: 21, y: 20 }, { x: 22, y: 21 }, { x: 25, y: 25 },
  ];
  expect(scoreDistributorService({ ...layout, roads })).toEqual({
    weight: 9, distanceCost: 210, roadCredit: 100, score: 99890,
  });
});
test('empty service population cannot win and malformed coordinates fail', () => {
  expect(scoreDistributorService({ ...layout, spawns: [], extensions: [] }).score).toBe(-Infinity);
  expect(() => scoreDistributorService({ ...layout, roads: [{ x: 50, y: 2 }] })).toThrow();
  expect(() => scoreDistributorService({ ...layout, spawns: [{ x: -1, y: 2 }] })).toThrow();
});
test('road array order and duplicates do not influence ranking', () => {
  const roads = [{ x: 21, y: 20 }, { x: 22, y: 20 }];
  const expected = scoreDistributorService({ ...layout, roads });
  expect(scoreDistributorService({ ...layout, roads: [...roads.reverse(), ...roads] })).toEqual(expected);
});
