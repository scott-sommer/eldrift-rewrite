import { expect, test } from 'vitest';
import { adjacentWorkTiles } from '../../src/capabilities/movement/work-tiles';
test('work tiles include eight interior neighbors but never exits or target tile', () => {
  expect(adjacentWorkTiles({ room: 'W0N0', x: 20, y: 20 })).toHaveLength(8);
  expect(adjacentWorkTiles({ room: 'W0N0', x: 1, y: 1 })).toEqual([
    { room: 'W0N0', x: 1, y: 2 }, { room: 'W0N0', x: 2, y: 1 }, { room: 'W0N0', x: 2, y: 2 },
  ]);
});
