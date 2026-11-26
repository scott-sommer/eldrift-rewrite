import { afterEach, expect, test, vi } from 'vitest';
import { createMovementLegality } from '../../src/adapters/screeps/movement-traffic';
import type { createMatrixSnapshots } from '../../src/adapters/screeps/matrix-snapshots';
afterEach(() => vi.unstubAllGlobals());
test('injected current access fences an otherwise passable empty tile before issuing native movement',() => {
  vi.stubGlobal('TERRAIN_MASK_WALL',1); vi.stubGlobal('Game',{ spawns: {},map: { getRoomTerrain: () => ({ get: () => 0 }) } });
  const snapshots = { prepare: () => ({ matrix: () => ({ get: () => 0 }) }) } as unknown as ReturnType<typeof createMatrixSnapshots>;
  const legal = createMovementLegality(snapshots,unit => unit === 'courier');
  const request = { unit: 'courier',owner: 'role',from: { room: 'W0N1',x: 47,y: 24 },to: { room: 'W0N1',x: 46,y: 25 },priority: 0,mobile: true };
  expect(legal(request)).toBe(true); expect(legal({ ...request,unit: 'unrelated' })).toBe(false);
});
