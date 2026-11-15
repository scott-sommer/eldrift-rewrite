import { expect, test } from 'vitest';
import { clearanceMap, connectedRegions } from '../../src/capabilities/planning/grid-analysis';
import { tileAt, tileIndex } from '../../src/core/geometry/local-grid';
const index = (x: number, y: number) => tileIndex({ x, y });
test('open room is one region and clearance accounts for outside-room cells', () => {
  const mask = Array<boolean>(2500).fill(true), distances = clearanceMap(mask);
  expect(connectedRegions(mask)).toEqual([{ id: 0, tiles: Array.from({ length: 2500 }, (_, i) => i) }]);
  expect(distances[index(0, 25)]).toBe(1);
  expect(distances[index(24, 24)]).toBe(25);
  expect(distances[index(49, 49)]).toBe(1);
  expect(mask.every(Boolean)).toBe(true);
});
test('solid barrier separates regions; diagonal adjacency remains connected', () => {
  const mask = Array.from({ length: 2500 }, (_, i) => tileAt(i).x !== 25);
  expect(connectedRegions(mask).map(region => [region.id, region.tiles.length])).toEqual([[0, 1250], [26, 1200]]);
  const sparse = Array<boolean>(2500).fill(false);
  sparse[index(10, 10)] = true; sparse[index(11, 11)] = true;
  expect(connectedRegions(sparse)).toEqual([{ id: index(10, 10), tiles: [index(10, 10), index(11, 11)] }]);
  expect(clearanceMap(sparse)[index(10, 10)]).toBe(1);
});
test('clearance matches independent nearest-obstacle distances across every tile', () => {
  const blocked = [{ x: 9, y: 10 }, { x: 25, y: 25 }, { x: 38, y: 40 }];
  const mask = Array<boolean>(2500).fill(true);
  for (const point of blocked) mask[tileIndex(point)] = false;
  const distances = clearanceMap(mask);
  for (let i = 0; i < 2500; i++) {
    const { x, y } = tileAt(i);
    const expected = Math.min(x + 1, y + 1, 50 - x, 50 - y,
      ...blocked.map(point => Math.max(Math.abs(x - point.x), Math.abs(y - point.y))));
    expect(distances[i]).toBe(expected);
  }
});
test('fully blocked rooms and invalid masks are explicit', () => {
  expect(connectedRegions(Array<boolean>(2500).fill(false))).toEqual([]);
  expect(clearanceMap(Array<boolean>(2500).fill(false)).every(value => value === 0)).toBe(true);
  expect(() => connectedRegions([])).toThrow('mask');
  expect(() => connectedRegions(Array<boolean>(2500))).toThrow('mask');
  expect(() => clearanceMap(Array(2500).fill(1) as boolean[])).toThrow('mask');
});
