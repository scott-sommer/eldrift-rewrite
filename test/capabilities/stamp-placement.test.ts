import { expect, test } from 'vitest';
import { placeStamp } from '../../src/capabilities/planning/stamp-placement';
import type { StampPlacementInput } from '../../src/capabilities/planning/stamp-placement';
import { planningObservation } from '../fixtures/planning-observation';
function input(): StampPlacementInput {
  return { stamp: { id: 'spawn-pod-v1', tiles: [
    { type: 'spawn', offset: { x: 0, y: 0 }, rcl: 1 },
    { type: 'road', offset: { x: 1, y: 0 }, rcl: 2 }], ports: [{ x: 1, y: 0 }] },
  anchor: { x: 25, y: 25 }, transform: 0, observation: planningObservation(),
  entries: [], corridors: [], blocksMovement: type => type === 'spawn' || type === 'storage' };
}
test('atomic stamp transforms preserve road ports and detach existing placements', () => {
  for (const transform of [0, 1, 2, 3, 4, 5, 6, 7] as const) {
    const request = input(); request.transform = transform;
    request.entries = [{ type: 'road', position: { x: 20, y: 20 }, rcl: 2 }];
    const before = JSON.stringify(request.entries), result = placeStamp(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.entries).toHaveLength(3);
    result.entries[0]!.position.x = 0;
    expect(JSON.stringify(request.entries)).toBe(before);
  }
});
test('terrain, locked placements and reserved corridors reject without partial mutation', () => {
  const request = input(), before = JSON.stringify(request.entries);
  request.observation.terrain = request.observation.terrain.map((cell, index) => index === 1275 ? 'wall' : cell);
  expect(placeStamp(request)).toMatchObject({ ok: false, reason: 'spawn:25:25:wall' });
  request.observation = planningObservation();
  request.observation.constraints = [{ id: 'manual', kind: 'locked', type: 'storage', position: { x: 25, y: 25 } }];
  expect(placeStamp(request)).toMatchObject({ ok: false, reason: 'manual:missing-lock' });
  request.observation.constraints = [];
  request.corridors = [{ x: 25, y: 25 }];
  expect(placeStamp(request)).toMatchObject({ ok: false, reason: 'blocked-corridor' });
  expect(JSON.stringify(request.entries)).toBe(before);
});
test('road joins retain existing metadata but blocked ports and missing roads fail', () => {
  const request = input();
  request.entries = [{ type: 'road', position: { x: 26, y: 25 }, rcl: 1, tag: 'manual' }];
  const joined = placeStamp(request);
  expect(joined).toMatchObject({ ok: true, entries: expect.arrayContaining([request.entries[0]]) });
  request.observation.infrastructure = [{ id: 'storage', type: 'storage', position: { x: 26, y: 25 }, owned: true, walkable: false }];
  expect(placeStamp(request)).toMatchObject({ ok: false, reason: 'blocked-port' });
  request.observation.infrastructure = [];
  request.stamp = { ...request.stamp, ports: [{ x: 0, y: 1 }] };
  expect(placeStamp(request)).toMatchObject({ ok: false, reason: 'blocked-port' });
});
test('out-of-bounds stamps fail atomically and unrelated locks await whole-plan validation', () => {
  const request = input(); request.anchor = { x: 48, y: 25 };
  expect(placeStamp(request)).toMatchObject({ ok: false, reason: 'bounds' });
  request.anchor = { x: 25, y: 25 };
  request.observation.constraints = [{ id: 'other', kind: 'locked', type: 'storage', position: { x: 30, y: 30 } }];
  expect(placeStamp(request).ok).toBe(true);
});

test('matching manual structures retain metadata and duplicate stamp cells reject', () => {
  const request = input();
  request.entries = [{ type: 'spawn', position: { x: 25, y: 25 }, rcl: 1, priority: -999, tag: 'manual' }];
  request.observation.constraints = [{ id: 'manual-spawn', kind: 'locked', type: 'spawn', position: { x: 25, y: 25 } }];
  const result = placeStamp(request);
  expect(result).toMatchObject({ ok: true, entries: expect.arrayContaining([request.entries[0]]) });
  request.stamp = { ...request.stamp, tiles: [...request.stamp.tiles, request.stamp.tiles[0]!] };
  expect(placeStamp(request)).toMatchObject({ ok: false, reason: 'duplicate-structure' });
});
