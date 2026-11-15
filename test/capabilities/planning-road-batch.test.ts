import { expect, test, vi } from 'vitest';
import { connectRoadBatch } from '../../src/capabilities/planning/road-connection-batch';
import { connectRoads } from '../../src/capabilities/planning/road-connections';
import type { RoadConnectionsInput } from '../../src/capabilities/planning/road-connections';
function input(): RoadConnectionsInput {
  return { start: { x: 10, y: 10 }, roads: [],
    targets: [{ id: 'a', position: { x: 13, y: 10 } }, { id: 'b', position: { x: 13, y: 12 } }],
    traversable: () => true, buildable: () => true,
    search: vi.fn((_start, goal, preferred) => ({ incomplete: false, cost: preferred.length ? 2 : 4,
      path: goal.y === 10 ? [{ x: 11, y: 10 }, { x: 12, y: 10 }] : [{ x: 11, y: 10 }, { x: 12, y: 11 }] })) };
}
test('resumed road drafts retain preferred-road reuse and match uninterrupted assembly', () => {
  const request = input(), first = connectRoadBatch(request, 'v1', undefined, 1);
  expect(first).toMatchObject({ ok: true, done: false, searches: 1 });
  const saved = JSON.parse(JSON.stringify(first.checkpoint));
  const final = connectRoadBatch(request, 'v1', saved, 1);
  expect(final).toMatchObject({ ok: true, done: true, searches: 1 });
  expect(request.search).toHaveBeenLastCalledWith(request.start, request.targets[1]!.position, first.checkpoint.roads);
  const full = connectRoads(request);
  if (!full.ok) throw new Error('fixture');
  expect(final.checkpoint.roads).toEqual(full.roads);
  expect(final.checkpoint.connections).toEqual(full.connections);
  expect(saved.connections).toHaveLength(1);
});
test('late failure cannot advance or add incomplete path tiles to the checkpoint', () => {
  const request = input(), first = connectRoadBatch(request, 'v1', undefined, 1);
  const result = connectRoadBatch({ ...request, search: () => ({ path: [{ x: 11, y: 11 }], cost: 2, incomplete: true }) },
    'v1', first.checkpoint, 1);
  expect(result).toMatchObject({ ok: false, target: 'b', reason: 'incomplete-search', checkpoint: first.checkpoint });
});
test('CPU yielding, interruption and completion never consume extra destinations', () => {
  const request = input(), first = connectRoadBatch(request, 'v1', undefined, 1);
  expect(connectRoadBatch(request, 'v1', first.checkpoint, 10, () => false)).toMatchObject({ searches: 0, done: false });
  const before = JSON.stringify(first.checkpoint);
  expect(() => connectRoadBatch({ ...request, search: () => { throw new Error('interrupted'); } }, 'v1', first.checkpoint, 1)).toThrow('interrupted');
  expect(JSON.stringify(first.checkpoint)).toBe(before);
  const complete = connectRoadBatch(request, 'v1', first.checkpoint, 10);
  expect(connectRoadBatch(request, 'v1', complete.checkpoint, 10)).toMatchObject({ searches: 0, done: true });
});
test('changed network or corrupted connection identity invalidates continuation', () => {
  const request = input(), first = connectRoadBatch(request, 'v1', undefined, 1);
  expect(() => connectRoadBatch(request, 'v2', first.checkpoint, 1)).toThrow('Stale');
  const invalid = { ...first.checkpoint, connections: [{ ...first.checkpoint.connections[0]!, id: 'wrong' }] };
  expect(() => connectRoadBatch(request, 'v1', invalid, 1)).toThrow('connection');
});
