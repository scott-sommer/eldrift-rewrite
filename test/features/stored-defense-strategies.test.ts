import { expect, test } from 'vitest';
import { createStoredDefenseStrategies } from '../../src/features/planning/stored-defense-strategies';
import { createDefenseSearchStore } from '../../src/features/planning/defense-search-store';
import type { Envelope } from '../../src/persistence/versioned-state';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';

test('common strategies recover durable cut progress after recreation and policy changes', () => {
  const records: Record<string, Envelope> = {};
  const store = createDefenseSearchStore({ read: key => records[key], write: (key, value) => { records[key] = value; } }, 'W0N1');
  const terrain: TerrainCell[] = Array(2500).fill('wall');
  for (let x = 0; x <= 10; x++) terrain[25 * 50 + x] = 'plain';
  const input = { observation: { terrain, objects: [], infrastructure: [], constraints: [] },
    protectedAssets: [{ type: 'storage', position: { x: 10, y: 25 } }],
    protectedTiles: [{ x: 10, y: 25 }], rcl: 6, costs: { rampart: 1, constructedWall: 1 } };
  const fallback = { terrain, bounds: { minX: 8, maxX: 12, minY: 23, maxY: 27 }, rcl: 6 };
  const budget = { augmentations: 1, scans: 100000 };
  const initial = createStoredDefenseStrategies(store, input, fallback);
  expect(initial.map(strategy => strategy.id)).toEqual(['terrain-cut-v1', 'exit-perimeter-v1', 'legacy-perimeter-v1']);
  expect(initial[0]!.advance(budget, () => false)).toEqual({ status: 'pending' });
  expect(Object.keys(records)).toHaveLength(0);
  initial[0]!.advance(budget, () => true);
  expect(store.read().checkpoint?.flow?.augmentations).toBe(1);
  const restored = createStoredDefenseStrategies(store, input, fallback)[0]!;
  restored.advance(budget, () => true);
  const result = restored.advance(budget, () => true);
  expect(result.status).toBe('complete');
  const changed = createStoredDefenseStrategies(store, { ...input, rcl: 7 }, fallback)[0]!;
  expect(changed.advance(budget, () => true)).toEqual({ status: 'pending' });
  expect(store.read().checkpoint).toBeUndefined();
  let next = changed.advance(budget, () => true);
  for (let n = 0; next.status === 'pending' && n < 5; n++) next = changed.advance(budget, () => true);
  expect(next.status).toBe('complete');
  if (next.status !== 'complete') throw new Error('Expected regenerated defense');
  expect(next.barriers.every(barrier => barrier.rcl === 7)).toBe(true);
});
