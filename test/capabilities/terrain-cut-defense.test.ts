import { expect, test } from 'vitest';
import { createTerrainCutDefense } from '../../src/capabilities/planning/terrain-cut-defense';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
function input() {
  const terrain: TerrainCell[] = Array(2500).fill('wall');
  for (let x = 0; x <= 10; x++) terrain[25 * 50 + x] = 'plain';
  return { observation: { terrain, objects: [], infrastructure: [], constraints: [] },
    protectedAssets: [{ type: 'storage', position: { x: 10, y: 25 } }],
    protectedTiles: [{ x: 10, y: 25 }], rcl: 6, costs: { rampart: 1, constructedWall: 1 } };
}
test('room adapter produces a legal staged choke cut with shared separation validation', () => {
  const request = input(), network = createTerrainCutDefense(request);
  request.observation.terrain.fill('wall');
  const result = network.advance(100);
  expect(result.status).toBe('complete');
  if (result.status !== 'complete') throw new Error('Expected cut');
  expect(result.barriers).toHaveLength(1);
  expect(result.barriers[0]).toMatchObject({ type: 'rampart', position: { x: 2, y: 25 }, rcl: 6 });
  expect(result.validation.ok).toBe(true);
});
test('forbidden clearance cells cannot be selected for barriers', () => {
  const request = input();
  const constraints = Array.from({ length: 8 }, (_, index) =>
    ({ id: 'clear-' + index, kind: 'keep-clear' as const, position: { x: index + 2, y: 25 } }));
  expect(createTerrainCutDefense({ ...request, observation: { ...request.observation, constraints } }).advance(100))
    .toMatchObject({ status: 'rejected', reason: 'no-legal-cut' });
});
