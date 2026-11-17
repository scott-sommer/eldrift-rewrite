import { expect, test } from 'vitest';
import { createStoredTerrainDefense } from '../../src/features/planning/stored-terrain-defense';
import { createDefenseSearchStore } from '../../src/features/planning/defense-search-store';
import type { Envelope } from '../../src/persistence/versioned-state';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
test('stored search recreates from durable progress and respects admission before store access', () => {
  const records: Record<string, Envelope> = {};
  const port = { read: (key: string) => records[key], write: (key: string, value: Envelope) => { records[key] = value; } };
  const store = createDefenseSearchStore(port, 'W0N1');
  const terrain: TerrainCell[] = Array(2500).fill('wall');
  for (let x = 0; x <= 10; x++) terrain[25 * 50 + x] = 'plain';
  const input = { observation: { terrain, objects: [], infrastructure: [], constraints: [] },
    protectedAssets: [{ type: 'storage', position: { x: 10, y: 25 } }],
    protectedTiles: [{ x: 10, y: 25 }], rcl: 6, costs: { rampart: 1, constructedWall: 1 } };
  const first = createStoredTerrainDefense(store, input), budget = { augmentations: 1, scans: 100000 };
  expect(first.advance(budget, () => false)).toEqual({ status: 'deferred' });
  expect(Object.keys(records)).toHaveLength(0);
  expect(first.advance(budget, () => true).status).toBe('advanced');
  expect(store.read().checkpoint?.flow?.augmentations).toBe(1);
  const restored = createStoredTerrainDefense(store, input);
  restored.advance(budget, () => true);
  const final = restored.advance(budget, () => true);
  expect(final.status).toBe('advanced');
  if (final.status !== 'advanced') throw new Error('Expected saved result');
  expect(final.result.status).toBe('complete');
  expect(first.advance(budget, () => true).status).toBe('advanced');
  expect(store.read().checkpoint?.flow?.augmentations).toBe(1);
});
