import { expect, test } from 'vitest';
import { adjacentTiles, insideRoom, tileAt, tileIndex } from '../../src/core/geometry/local-grid';
import { placeOffset, transformOffset } from '../../src/core/geometry/transforms';
import type { TransformIndex } from '../../src/core/geometry/transforms';
test('all room tiles round-trip and neighbour lists never wrap or include self', () => {
  for (let index = 0; index < 2500; index++) {
    const point = tileAt(index), neighbours = adjacentTiles(point);
    expect(tileIndex(point)).toBe(index);
    expect(new Set(neighbours.map(tileIndex)).size).toBe(neighbours.length);
    expect(neighbours.every(other => insideRoom(other) && tileIndex(other) !== index)).toBe(true);
  }
  expect(adjacentTiles({ x: 0, y: 0 })).toEqual([{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]);
  expect(adjacentTiles({ x: 49, y: 49 })).toHaveLength(3);
  expect(adjacentTiles({ x: 0, y: 25 })).toHaveLength(5);
  expect(adjacentTiles({ x: 25, y: 25 })).toHaveLength(8);
});
test('eight transformations preserve legacy indices and distance without mutating offsets', () => {
  const point = { x: 2, y: 3 };
  const expected = [[2, 3], [-3, 2], [-2, -3], [3, -2], [-2, 3], [2, -3], [3, 2], [-3, -2]];
  for (let index = 0; index < 8; index++) {
    const result = transformOffset(point, index as TransformIndex);
    expect([result.x, result.y]).toEqual(expected[index]);
    expect(Math.max(Math.abs(result.x), Math.abs(result.y))).toBe(3);
  }
  expect(point).toEqual({ x: 2, y: 3 });
  expect(transformOffset(transformOffset(point, 1), 3)).toEqual(point);
  for (const index of [4, 5, 6, 7] as const) expect(transformOffset(transformOffset(point, index), index)).toEqual(point);
});
test('placement respects margins and rejects malformed or overflowing coordinates', () => {
  expect(placeOffset({ x: 0, y: 0 }, { x: 1, y: 0 }, 2)).toBeUndefined();
  expect(placeOffset({ x: 49, y: 49 }, { x: 1, y: 0 }, 0)).toBeUndefined();
  expect(placeOffset({ x: 2, y: 2 }, { x: 0, y: 0 }, 0, 2)).toEqual({ x: 2, y: 2 });
  expect(placeOffset({ x: 1, y: 2 }, { x: 0, y: 0 }, 0, 2)).toBeUndefined();
  expect(() => tileAt(2500)).toThrow();
  expect(() => tileIndex({ x: 0.5, y: 2 })).toThrow();
  expect(() => transformOffset({ x: NaN, y: 0 }, 0)).toThrow();
  expect(() => transformOffset({ x: 1, y: 0 }, 8 as TransformIndex)).toThrow();
  expect(() => insideRoom({ x: 25, y: 25 }, -1)).toThrow();
});
