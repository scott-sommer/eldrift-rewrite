import { expect, test } from 'vitest';
import { createTerrainDefenseRequest } from '../../src/features/planning/terrain-defense-request';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
function input() {
  const terrain: TerrainCell[] = Array(2500).fill('wall');
  for (let x = 0; x <= 10; x++) terrain[25 * 50 + x] = 'plain';
  return { observation: { terrain, objects: [], infrastructure: [], constraints: [] },
    protectedAssets: [{ type: 'storage', position: { x: 10, y: 25 } }],
    protectedTiles: [{ x: 10, y: 25 }], rcl: 6, costs: { rampart: 1, constructedWall: 1 } };
}
test('request restores flow and retains its checkpoint during cold preparation', () => {
  const request = input(), first = createTerrainDefenseRequest(request).advance(1, () => true, 100000);
  expect(first.checkpoint.flow?.augmentations).toBe(1);
  const saved = JSON.parse(JSON.stringify(first.checkpoint));
  const resumed = createTerrainDefenseRequest(request, saved);
  const paused = resumed.advance(1, () => false, 1);
  expect(paused.checkpoint).toEqual(saved);
  paused.checkpoint.identity = 'mutated';
  let next = resumed.advance(1, () => true, 10);
  for (let tick = 0; next.result.status === 'pending' && tick < 1000; tick++) next = resumed.advance(1, () => true, 10);
  expect(next.result.status).toBe('complete');
  expect(next.checkpoint.identity).toBe(saved.identity);
});
test('staging, protection and room changes invalidate requests before work starts', () => {
  const request = input(), saved = createTerrainDefenseRequest(request).advance(0, () => false, 0).checkpoint;
  expect(() => createTerrainDefenseRequest({ ...request, rcl: 7 }, saved)).toThrow('Stale');
  expect(() => createTerrainDefenseRequest({ ...request, protectedAssets: [] }, saved)).toThrow('Stale');
  request.observation.terrain[25 * 50 + 5] = 'wall';
  expect(() => createTerrainDefenseRequest(request, saved)).toThrow('Stale');
});
