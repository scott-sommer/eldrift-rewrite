import { expect, test } from 'vitest';
import { nearbyUtility, sourceLinkPosition } from '../../src/capabilities/planning/utility-placement';
test('nearby utility preserves range, target attraction, road credit and x-major ties', () => {
  const search = { center: { x: 25, y: 25 }, minRange: 1, maxRange: 2,
    targets: [], available: () => true, adjacentRoads: () => 0 };
  expect(nearbyUtility(search)).toEqual({ x: 24, y: 24 });
  expect(nearbyUtility({ ...search, targets: [{ x: 30, y: 25 }] })).toEqual({ x: 26, y: 24 });
  expect(nearbyUtility({ ...search, adjacentRoads: position => position.x === 25 && position.y === 26 ? 3 : 0 }))
    .toEqual({ x: 25, y: 26 });
  expect(nearbyUtility({ ...search, available: () => false })).toBeUndefined();
});
test('source link stays adjacent to miner container, within source range two, and outside reserved positions', () => {
  const search = { source: { x: 10, y: 10 }, container: { x: 11, y: 11 }, storage: { x: 25, y: 25 },
    available: () => true, adjacentRoads: () => 0 };
  expect(sourceLinkPosition(search)).toEqual({ x: 12, y: 12 });
  expect(sourceLinkPosition({ ...search, available: position => position.x !== 12 }))
    .toEqual({ x: 11, y: 12 });
  expect(sourceLinkPosition({ ...search, available: () => false })).toBeUndefined();
});
test('search clips room edges and rejects invalid configured ranges', () => {
  const search = { center: { x: 1, y: 1 }, minRange: 1, maxRange: 2,
    targets: [], available: () => true, adjacentRoads: () => 0 };
  expect(nearbyUtility(search)).toEqual({ x: 1, y: 2 });
  expect(() => nearbyUtility({ ...search, maxRange: 0 })).toThrow('range');
});
