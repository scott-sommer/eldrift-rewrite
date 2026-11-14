import { expect, test } from 'vitest';
import { movementCosts, costRevision } from '../../src/capabilities/movement/costs';
const tile = { x: 10, y: 20 };
test('fixed obstacles override roads and optional unit overlays never mutate input', () => {
  const observation = { roads: [tile, { x: 11, y: 20 }], obstacles: [tile], units: [{ x: 11, y: 20 }] };
  const before = JSON.stringify(observation);
  expect(movementCosts(observation, 1, false)).toEqual([{ ...tile, cost: 255 }, { x: 11, y: 20, cost: 1 }]);
  expect(movementCosts(observation, 1, true)).toEqual([{ ...tile, cost: 255 }, { x: 11, y: 20, cost: 255 }]);
  expect(JSON.stringify(observation)).toBe(before);
});
test('canonical revisions change with blockers and costs but not observation order', () => {
  const observation = { roads: [tile, { x: 1, y: 2 }], obstacles: [], units: [] };
  const revision = costRevision(movementCosts(observation, 1, true));
  expect(costRevision(movementCosts({ ...observation, roads: [...observation.roads].reverse() }, 1, true))).toBe(revision);
  expect(costRevision(movementCosts({ ...observation, obstacles: [tile] }, 1, true))).not.toBe(revision);
  expect(costRevision(movementCosts(observation, 2, true))).not.toBe(revision);
});
