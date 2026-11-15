import { expect, test } from 'vitest';
import { assessTerrain } from '../../src/capabilities/planning/terrain';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
test('open terrain separates passability from core placement margins and directional exits', () => {
  const terrain = Array<TerrainCell>(2500).fill('plain');
  const result = assessTerrain(terrain);
  expect(result.passable.filter(Boolean)).toHaveLength(2500);
  expect(result.buildable.filter(Boolean)).toHaveLength(46 * 46);
  expect(result.regions).toHaveLength(1);
  expect(result.exits.map(group => [group.side, group.tiles.length])).toEqual([
    ['top', 50], ['right', 50], ['bottom', 50], ['left', 50],
  ]);
  expect(result.clearance[2 * 50 + 2]).toBe(1);
  expect(result.costs.every(cost => cost === 1)).toBe(true);
});
test('swamp-heavy disconnected room retains costs and split exit groups', () => {
  const terrain = Array<TerrainCell>(2500).fill('swamp');
  for (let y = 0; y < 50; y++) terrain[y * 50 + 25] = 'wall';
  const result = assessTerrain(terrain, { plain: 2, swamp: 10 });
  expect(result.counts).toEqual({ plain: 0, swamp: 2450, wall: 50 });
  expect(result.regions.map(region => region.tiles.length)).toEqual([23 * 46, 22 * 46]);
  expect(result.exits.filter(group => group.side === 'top').map(group => group.tiles.length)).toEqual([25, 24]);
  expect(result.costs[25]).toBe(255);
  expect(result.costs[26]).toBe(10);
  expect(terrain[26]).toBe('swamp');
});
test('closed terrain has no exits or buildable regions; malformed inputs fail', () => {
  const terrain = Array<TerrainCell>(2500).fill('wall');
  expect(assessTerrain(terrain)).toMatchObject({ exits: [], regions: [], counts: { wall: 2500 } });
  expect(() => assessTerrain(Array<TerrainCell>(2500))).toThrow('terrain');
  expect(() => assessTerrain(terrain, { plain: 0, swamp: 5 })).toThrow('costs');
  expect(() => assessTerrain(terrain, { plain: 1, swamp: 255 })).toThrow('costs');
  expect(() => assessTerrain(terrain, { plain: 1, swamp: 5 }, 25)).toThrow('margin');
});
