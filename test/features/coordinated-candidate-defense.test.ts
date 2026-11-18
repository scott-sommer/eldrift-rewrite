import { expect, test, vi } from 'vitest';
import { createCoordinatedCandidateDefense } from '../../src/features/planning/coordinated-candidate-defense';
import { createStoredDefenseStrategies } from '../../src/features/planning/stored-defense-strategies';
import { createDefenseSearchStore } from '../../src/features/planning/defense-search-store';
import type { Envelope } from '../../src/persistence/versioned-state';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
const candidate = { id: 'custom', strategy: 'custom', anchor: { x: 25, y: 25 }, transform: 0 as const };
function fixture() {
  const records: Record<string, Envelope> = {};
  const store = createDefenseSearchStore({ read: key => records[key], write: (key, value) => { records[key] = value; } }, 'W0N1');
  const terrain: TerrainCell[] = Array.from({ length: 2500 }, (_, index) =>
    Math.floor(index / 50) === 25 && index % 50 <= 30 ? 'plain' : 'wall');
  const observation = { terrain, objects: [], infrastructure: [], constraints: [] };
  const storage = { type: 'storage', position: { x: 25, y: 25 }, rcl: 4 };
  const prepare = vi.fn(() => {
    const generation = { observation, protectedAssets: [storage], protectedTiles: [storage.position],
      rcl: 6, costs: { rampart: 1, constructedWall: 1 } };
    return { strategies: createStoredDefenseStrategies(store, generation, { terrain, rcl: 6,
      bounds: { minX: 22, maxX: 28, minY: 22, maxY: 28 } }),
    input: { ...generation, placements: [storage], origins: [{ x: 24, y: 25 }], gates: [], repairRange: 3,
      blocksMovement: (type: string) => type !== 'rampart',
      operations: { rampartDecayHits: 300, rampartDecayTicks: 100, repairEnergyPerHit: 0.01,
        minimumTowerPower: 0, tower: { power: 600, optimalRange: 5, falloffRange: 20, falloff: 0.75 } } },
    policy: { weights: { construction: 1, upkeep: 1, repairAccess: 0, gateAccess: 0, towerDeficit: 0 },
      maximumUnreachableRepair: 2500, maximumBlockedGates: 0 } };
  });
  const create = () => createCoordinatedCandidateDefense('test-v1', prepare, { augmentations: 1, scans: 100000 });
  return { create, prepare, entries: [storage], records };
}
test.each([1, 3, 6])('candidate defense converges after cache loss at call %s', resetAt => {
  const setup = fixture();
  let defense = setup.create(), checkpoint: unknown = null;
  let result = defense.advance(candidate, setup.entries, checkpoint, () => true);
  for (let call = 1; result.status === 'pending' && call < 100; call++) {
    checkpoint = JSON.parse(JSON.stringify(result.checkpoint));
    if (call === resetAt) defense = setup.create();
    result = defense.advance(candidate, setup.entries, checkpoint, () => true);
  }
  expect(result.status).toBe('complete');
  if (result.status !== 'complete') throw new Error('Expected selected defense');
  expect(result.entries.filter(entry => entry.type === 'rampart')).toHaveLength(1);
  expect(result.entries.find(entry => entry.type === 'storage')).toEqual(setup.entries[0]);
  expect(setup.prepare).toHaveBeenCalledTimes(2);
  expect(Object.keys(setup.records)).toEqual(['defense-search/W0N1']);
});
test('denied admission avoids setup and changed request refuses another candidate checkpoint', () => {
  const setup = fixture(), defense = setup.create();
  expect(defense.advance(candidate, setup.entries, null, () => false)).toEqual({ status: 'pending', checkpoint: null });
  expect(setup.prepare).not.toHaveBeenCalled();
  const result = defense.advance(candidate, setup.entries, null, () => true);
  if (result.status !== 'pending') throw new Error('Expected progress');
  expect(() => defense.advance({ ...candidate, id: 'other' }, setup.entries, result.checkpoint, () => true)).toThrow('Stale');
});

test('older authoritative checkpoint replaces the newer cached coordinator', () => {
  const setup = fixture(), defense = setup.create();
  const first = defense.advance(candidate, setup.entries, null, () => true);
  if (first.status !== 'pending') throw new Error('Expected progress');
  const old = JSON.parse(JSON.stringify(first.checkpoint));
  const second = defense.advance(candidate, setup.entries, first.checkpoint, () => true);
  if (second.status !== 'pending') throw new Error('Expected progress');
  defense.advance(candidate, setup.entries, second.checkpoint, () => true);
  defense.advance(candidate, setup.entries, old, () => true);
  expect(setup.prepare).toHaveBeenCalledTimes(2);
});
test('a completed selection without eligible defenses rejects rather than passing an exposed plan', () => {
  const setup = fixture();
  const defense = createCoordinatedCandidateDefense('reject-v1', () => ({ ...setup.prepare(),
    strategies: [{ id: 'unavailable', advance: () => ({ status: 'rejected', reason: 'no-legal-cut' }) }] }),
  { augmentations: 1, scans: 100 });
  let result = defense.advance(candidate, setup.entries, null, () => true);
  for (let call = 0; result.status === 'pending' && call < 5; call++) {
    result = defense.advance(candidate, setup.entries, result.checkpoint, () => true);
  }
  expect(result).toEqual({ status: 'rejected', reason: 'no-valid-defense' });
});

test('legacy object checkpoints restore and upgrade without changing the selected geometry', () => {
  const setup = fixture(), defense = setup.create();
  const first = defense.advance(candidate, setup.entries, null, () => true);
  if (first.status !== 'pending') throw new Error('Expected progress');
  const encoded = first.checkpoint as { version: number; request: string; payload: string };
  expect(encoded.version).toBe(2);
  const legacy = { version: 1, request: encoded.request, coordinator: JSON.parse(encoded.payload) };
  let result = setup.create().advance(candidate, setup.entries, legacy, () => true);
  for (let call = 0; result.status === 'pending' && call < 100; call++) {
    expect((result.checkpoint as { version: number }).version).toBe(2);
    result = defense.advance(candidate, setup.entries, result.checkpoint, () => true);
  }
  expect(result.status).toBe('complete');
  if (result.status === 'complete') expect(result.entries.filter(entry => entry.type === 'rampart')).toHaveLength(1);
});
test('encoded cache recovery rejects malformed payloads and corrupt generated geometry', () => {
  const setup = fixture(), defense = setup.create();
  const first = defense.advance(candidate, setup.entries, null, () => true);
  if (first.status !== 'pending') throw new Error('Expected progress');
  const saved = first.checkpoint as { version: number; request: string; payload: string };
  for (const payload of ['{', 'null', '[]', '{}', 'x'.repeat(2000001)]) {
    expect(() => setup.create().advance(candidate, setup.entries, { ...saved, payload }, () => true)).toThrow();
  }
  const coordinator = JSON.parse(saved.payload);
  coordinator.generated = [{ id: 'wrong-strategy', status: 'complete', barriers: [] }];
  expect(() => setup.create().advance(candidate, setup.entries,
    { ...saved, payload: JSON.stringify(coordinator) }, () => true)).toThrow('order');
  coordinator.generated = [{ id: 'terrain-cut-v1', status: 'complete', barriers: [
    { type: 'rampart', position: { x: 50, y: 25 }, rcl: 4 } ] }];
  expect(() => setup.create().advance(candidate, setup.entries,
    { ...saved, payload: JSON.stringify(coordinator) }, () => true)).toThrow('position');
  expect(() => setup.create().advance(candidate, setup.entries, { ...saved, version: 3 }, () => true)).toThrow('checkpoint');
});
