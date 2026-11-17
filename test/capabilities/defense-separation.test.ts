import { expect, test } from 'vitest';
import { defenseEntryTiles, defenseSeparation } from '../../src/capabilities/planning/defense-separation';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
test('diagonal leaks expose assets and intact barriers close the connection', () => {
  const terrain: TerrainCell[] = Array(2500).fill('wall');
  for (let n = 0; n <= 10; n++) terrain[n * 50 + n] = 'plain';
  const input = { terrain, entries: defenseEntryTiles(terrain), barriers: [],
    assets: [{ id: 'storage', position: { x: 10, y: 10 } }] };
  expect(defenseSeparation(input).exposed).toEqual(['storage']);
  expect(defenseSeparation({ ...input, barriers: [{ x: 5, y: 5 }] }).separated).toBe(true);
});
test('all exits are explicit while disconnected natural chambers stay protected', () => {
  const terrain: TerrainCell[] = Array(2500).fill('wall');
  terrain[0] = 'plain'; terrain[2499] = 'plain'; terrain[25 * 50 + 25] = 'plain';
  expect(defenseEntryTiles(terrain)).toEqual([{ x: 0, y: 0 }, { x: 49, y: 49 }]);
  const input = { terrain, entries: defenseEntryTiles(terrain), barriers: [],
    assets: [{ id: 'core', position: { x: 25, y: 25 } }, { id: 'remote', position: { x: 49, y: 49 } }] };
  expect(defenseSeparation(input).exposed).toEqual(['remote']);
  expect(defenseSeparation({ ...input, entries: [{ x: 0, y: 0 }] }).exposed).toEqual([]);
  expect(defenseSeparation({ ...input, barriers: [{ x: 49, y: 49 }] }).exposed).toEqual([]);
});
test('invalid observations and duplicate assets fail explicitly', () => {
  expect(() => defenseEntryTiles([])).toThrow('terrain');
  const terrain: TerrainCell[] = Array(2500).fill('wall');
  expect(() => defenseSeparation({ terrain, entries: [{ x: 0, y: 0 }], barriers: [], assets: [] })).toThrow('entry');
  const asset = { id: 'same', position: { x: 25, y: 25 } };
  expect(() => defenseSeparation({ terrain, entries: [], barriers: [], assets: [asset, asset] })).toThrow('identities');
});
