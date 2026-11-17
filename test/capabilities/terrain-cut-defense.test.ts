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

test('tiny scan slices and CPU yielding preserve the same validated staged defense', () => {
  const request = input(), expected = createTerrainCutDefense(request).advance(100);
  const network = createTerrainCutDefense(request);
  expect(network.advance(100, () => true, 0)).toMatchObject({ status: 'pending' });
  expect(network.advance(100, () => false, 1)).toMatchObject({ status: 'pending' });
  let result = network.advance(1, () => true, 1), slices = 1;
  while (result.status === 'pending' && slices < 10000) {
    result = network.advance(1, () => true, 1); slices++;
  }
  expect(slices).toBeGreaterThan(10);
  expect(result).toEqual(expected);
  expect(() => network.advance(1, () => true, -1)).toThrow('scan budget');
});

test('exhausting preparation allowance yields before graph construction and honors the next guard', () => {
  const request = input();
  request.protectedTiles = [{ x: 25, y: 24 }]; // Blocked terminal is detected when graph construction begins.
  const network = createTerrainCutDefense(request);
  expect(network.advance(1, () => true, 2500)).toMatchObject({ status: 'pending' });
  expect(network.advance(1, () => false, 100)).toMatchObject({ status: 'pending' });
  expect(network.advance(1, () => true, 0)).toMatchObject({ status: 'pending' });
  expect(() => network.advance(1, () => true, 100)).toThrow('Blocked cut terminal');
});

test('completed defense is retained with detached results when subsequent CPU admission is denied', () => {
  const network = createTerrainCutDefense(input()), result = network.advance(100);
  expect(result.status).toBe('complete');
  if (result.status !== 'complete') throw new Error('Expected completed defense');
  const expected = JSON.parse(JSON.stringify(result));
  result.barriers[0]!.position.x = 49;
  result.validation.cost = 999;
  expect(network.advance(0, () => false, 0)).toEqual(expected);
});
