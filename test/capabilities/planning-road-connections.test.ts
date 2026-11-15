import { expect, test } from 'vitest';
import { connectRoads } from '../../src/capabilities/planning/road-connections';
const input = {
  start: { x: 10, y: 10 }, targets: [{ id: 'source', position: { x: 13, y: 10 } }], roads: [],
  traversable: () => true, buildable: () => true,
  search: () => ({ path: [{ x: 11, y: 10 }, { x: 12, y: 10 }], incomplete: false, cost: 4 }),
};
test('complete searches produce deduplicated roads and measured connection metadata', () => {
  expect(connectRoads(input)).toEqual({ ok: true, roads: [{ x: 11, y: 10 }, { x: 12, y: 10 }],
    connections: [{ id: 'source', cost: 4, steps: 2 }] });
});
test('partial search, false completeness, discontinuity and blocked roads all reject', () => {
  for (const [search, reason] of [
    [() => ({ ...input.search(), incomplete: true }), 'incomplete-search'],
    [() => ({ path: [], incomplete: false, cost: 0 }), 'unreached-target'],
    [() => ({ path: [{ x: 12, y: 10 }], incomplete: false, cost: 2 }), 'discontinuous-path'],
  ] as const) expect(connectRoads({ ...input, search })).toEqual({ ok: false, target: 'source', reason });
  expect(connectRoads({ ...input, traversable: () => false })).toMatchObject({ ok: false, reason: 'blocked-path' });
  expect(connectRoads({ ...input, buildable: () => false })).toMatchObject({ ok: false, reason: 'unbuildable-road' });
});
test('later failure discards the detached draft while successful roads become preferences for subsequent paths', () => {
  const seen: number[] = [];
  const roads = [{ x: 9, y: 10 }];
  const result = connectRoads({ ...input, roads, targets: [...input.targets, { id: 'mineral', position: { x: 15, y: 10 } }],
    search: (_start, goal, preferred) => {
      seen.push(preferred.length);
      return { ...input.search(), incomplete: goal.x === 15 };
    } });
  expect(seen).toEqual([1, 3]);
  expect(result).toEqual({ ok: false, target: 'mineral', reason: 'incomplete-search' });
  expect(roads).toEqual([{ x: 9, y: 10 }]);
});
test('already-adjacent target accepts a complete zero-length connection', () => {
  expect(connectRoads({ ...input, targets: [{ id: 'close', position: { x: 11, y: 10 } }],
    search: () => ({ path: [], incomplete: false, cost: 0 }) })).toMatchObject({ ok: true, roads: [] });
});
