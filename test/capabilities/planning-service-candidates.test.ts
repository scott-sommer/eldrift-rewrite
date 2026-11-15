import { expect, test } from 'vitest';
import { serviceCandidates, serviceCandidateScore, utilityCandidateScore, selectServicePositions }
  from '../../src/capabilities/planning/service-candidates';
test('road neighbourhood is deduplicated, bounded, filtered and has exact adjacency counts', () => {
  const storage = { x: 25, y: 25 };
  const roads = [{ x: 25, y: 26 }, { x: 26, y: 26 }, { x: 25, y: 26 }];
  const candidates = serviceCandidates(storage, roads, tile => tile.x !== 24);
  expect(candidates.some(item => item.position.x === 24)).toBe(false);
  expect(candidates.some(item => item.position.x === 25 && item.position.y === 26)).toBe(false);
  expect(new Set(candidates.map(item => JSON.stringify(item.position))).size).toBe(candidates.length);
  expect(candidates.find(item => item.position.x === 25 && item.position.y === 25))
    .toEqual({ position: storage, range: 0, adjacentRoads: 2 });
  expect(serviceCandidates(storage, [{ x: 1, y: 1 }, { x: 49, y: 49 }], () => true)).toEqual([]);
});
test('legacy service and utility scores retain type-specific penalties', () => {
  const candidate = { position: { x: 30, y: 27 }, range: 5, adjacentRoads: 2 };
  const storage = { x: 25, y: 25 };
  const controller = { x: 35, y: 30 };
  expect(serviceCandidateScore(candidate, 'spawn', storage, controller)).toBe(45);
  expect(serviceCandidateScore(candidate, 'tower', storage, controller)).toBe(48);
  expect(serviceCandidateScore(candidate, 'extension', storage, controller)).toBe(41);
  expect(utilityCandidateScore(candidate, controller)).toBe(45);
});
test('selection preserves legacy lexical tie order and returns independent positions', () => {
  const candidates = [{ position: { x: 9, y: 12 }, range: 1, adjacentRoads: 1 },
    { position: { x: 10, y: 12 }, range: 1, adjacentRoads: 1 }];
  const selected = selectServicePositions(candidates, 1, () => 0);
  expect(selected).toEqual([{ x: 10, y: 12 }]);
  selected[0]!.x = 0;
  expect(candidates[1]!.position.x).toBe(10);
  expect(() => selectServicePositions(candidates, -1, () => 0)).toThrow('count');
});
