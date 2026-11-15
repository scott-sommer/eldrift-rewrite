import { expect, test } from 'vitest';
import { terrainPlacementFailure } from '../../src/capabilities/planning/terrain-placement';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
const terrain = Array<TerrainCell>(2500).fill('plain');
test('roads may cross terrain walls but ordinary structures cannot; absolute borders reject all', () => {
  const map = [...terrain]; map[25 * 50 + 25] = 'wall';
  const input = { terrain: map, objects: [] };
  expect(terrainPlacementFailure({ type: 'road', position: { x: 25, y: 25 } }, input)).toBeUndefined();
  expect(terrainPlacementFailure({ type: 'spawn', position: { x: 25, y: 25 } }, input)).toBe('wall');
  expect(terrainPlacementFailure({ type: 'road', position: { x: 0, y: 25 } }, input)).toBe('border');
});
test('exit-adjacent buildings require closed border terrain; roads and containers are exempt', () => {
  const position = { x: 1, y: 25 };
  expect(terrainPlacementFailure({ type: 'spawn', position }, { terrain, objects: [] })).toBe('exit-adjacency');
  for (const type of ['road', 'container']) {
    expect(terrainPlacementFailure({ type, position }, { terrain, objects: [] })).toBeUndefined();
  }
  const closed = [...terrain];
  for (const y of [24, 25, 26]) closed[y * 50] = 'wall';
  expect(terrainPlacementFailure({ type: 'spawn', position }, { terrain: closed, objects: [] })).toBeUndefined();
});
test('extractors require minerals and other fixed objects are protected from occupancy', () => {
  const position = { x: 25, y: 25 };
  const objects = [{ id: 'm', kind: 'mineral' as const, position }];
  expect(terrainPlacementFailure({ type: 'extractor', position }, { terrain, objects })).toBeUndefined();
  expect(terrainPlacementFailure({ type: 'extractor', position }, { terrain, objects: [] })).toBe('missing-mineral');
  expect(terrainPlacementFailure({ type: 'road', position }, { terrain, objects })).toBe('fixed-object');
  expect(terrainPlacementFailure({ type: 'spawn', position }, {
    terrain, objects: [{ id: 's', kind: 'source', position }],
  })).toBe('fixed-object');
});
test('corner-adjacent placement checks both exits, conservatively avoiding the engine single-side overwrite', () => {
  const closed = [...terrain];
  for (const x of [0, 1, 2]) closed[x] = 'wall';
  expect(terrainPlacementFailure({ type: 'spawn', position: { x: 1, y: 1 } },
    { terrain: closed, objects: [] })).toBe('exit-adjacency');
});
