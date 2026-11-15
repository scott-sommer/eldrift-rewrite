import { expect, test } from 'vitest';
import { adjacentContainer } from '../../src/capabilities/planning/container-placement';
const search = { origin: { x: 10, y: 10 }, available: () => true, adjacentRoads: () => 0, open: () => true };
test('container search retains legacy x-major ties and storage-facing preference', () => {
  expect(adjacentContainer(search)).toEqual({ x: 9, y: 9 });
  expect(adjacentContainer({ ...search, target: { x: 25, y: 25 } })).toEqual({ x: 11, y: 11 });
});
test('road and open-space credits influence placement while reservations remain hard constraints', () => {
  const roadPreferred = { ...search, adjacentRoads: (position: { x: number; y: number }) =>
    position.x === 11 && position.y === 11 ? 2 : 0 };
  expect(adjacentContainer(roadPreferred)).toEqual({ x: 11, y: 11 });
  expect(adjacentContainer({ ...roadPreferred, available: position => position.x !== 11 })).toEqual({ x: 9, y: 9 });
  expect(adjacentContainer({ ...search, open: position => position.x >= 11 })).toEqual({ x: 11, y: 9 });
});
test('no eligible adjacent tile returns no placement and room borders are excluded', () => {
  expect(adjacentContainer({ ...search, available: () => false })).toBeUndefined();
  expect(adjacentContainer({ ...search, origin: { x: 1, y: 1 } })).toEqual({ x: 1, y: 2 });
});
