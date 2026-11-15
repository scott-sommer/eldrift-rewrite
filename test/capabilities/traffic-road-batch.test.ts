import { expect, test, vi } from 'vitest';
import { connectTrafficBatch } from '../../src/capabilities/planning/traffic-road-batch';
import { connectTrafficRoads } from '../../src/capabilities/planning/traffic-roads';
import type { TrafficRoadInput } from '../../src/capabilities/planning/traffic-roads';
const primary = [{ x: 11, y: 10 }, { x: 12, y: 10 }, { x: 13, y: 10 }];
const alternate = [{ x: 11, y: 11 }, { x: 12, y: 11 }, { x: 13, y: 11 }];
function request(): TrafficRoadInput {
  return { start: { x: 10, y: 10 }, targets: [{ id: 'source', position: { x: 14, y: 10 } }],
    roads: [], traversable: () => true, buildable: () => true,
    search: vi.fn((_start, _goal, _roads, blocked) => ({
      path: blocked.length ? alternate : primary, incomplete: false, cost: 3 })) };
}
test('JSON checkpoint between lanes preserves exact synchronous result and detached state', () => {
  const input = request();
  const first = connectTrafficBatch(input, 'v1', undefined, 1);
  expect(first).toMatchObject({ ok: true, done: false, searches: 1, checkpoint: { blocked: primary.slice(0, 2), lanes: [] } });
  const saved = JSON.stringify(first.checkpoint);
  const second = connectTrafficBatch(input, 'v1', JSON.parse(saved), 1);
  expect(second).toMatchObject({ ok: true, done: true, searches: 1 });
  expect({ ok: true, roads: second.checkpoint.network.roads, lanes: second.checkpoint.lanes }).toEqual(connectTrafficRoads(input));
  expect(JSON.stringify(first.checkpoint)).toBe(saved);
  expect(connectTrafficBatch(input, 'v1', second.checkpoint, 5)).toMatchObject({ done: true, searches: 0 });
});
test('alternate failure preserves primary and required failure never advances', () => {
  const input = request();
  input.search = (_start, _goal, _roads, blocked) => ({ path: primary, incomplete: blocked.length > 0, cost: 3 });
  const result = connectTrafficBatch(input, 'v1', undefined, 2);
  expect(result).toMatchObject({ ok: true, done: true, checkpoint: { network: { roads: primary },
    lanes: [{ secondaryFailure: 'incomplete-search' }] } });
  input.targets = [...input.targets, { id: 'far', position: { x: 40, y: 40 } }];
  const failed = connectTrafficBatch(input, 'v1', undefined, 3);
  expect(failed).toMatchObject({ ok: false, target: 'far', searches: 3, checkpoint: { lanes: [{ id: 'source' }] } });
  expect(failed.checkpoint.network.connections).toHaveLength(1);
});
test('guard yields without searching and thrown searches do not mutate stored checkpoint', () => {
  const input = request();
  const first = connectTrafficBatch(input, 'v1', undefined, 1);
  const saved = JSON.stringify(first.checkpoint);
  expect(connectTrafficBatch(input, 'v1', first.checkpoint, 2, () => false)).toMatchObject({ done: false, searches: 0 });
  input.search = () => { throw new Error('CPU exhausted'); };
  expect(() => connectTrafficBatch(input, 'v1', first.checkpoint, 1)).toThrow('CPU exhausted');
  expect(JSON.stringify(first.checkpoint)).toBe(saved);
});
test('revision, phase, and lane result corruption are rejected before search', () => {
  const input = request();
  const first = connectTrafficBatch(input, 'v1', undefined, 1);
  expect(() => connectTrafficBatch(input, 'v2', first.checkpoint, 1)).toThrow('Stale');
  const invalid = structuredClone(first.checkpoint);
  delete invalid.blocked;
  expect(() => connectTrafficBatch(input, 'v1', invalid, 1)).toThrow('phase');
  const done = connectTrafficBatch(input, 'v1', first.checkpoint, 1);
  done.checkpoint.lanes[0]!.secondaryFailure = 'invalid';
  expect(() => connectTrafficBatch(input, 'v1', done.checkpoint, 1)).toThrow('secondary result');
});
test('empty primary interior still requires a separate alternate search', () => {
  const input = request();
  input.targets = [{ id: 'near', position: { x: 11, y: 10 } }];
  input.search = vi.fn(() => ({ path: [], incomplete: false, cost: 0 }));
  const first = connectTrafficBatch(input, 'v1', undefined, 1);
  expect(first).toMatchObject({ done: false, checkpoint: { blocked: [] } });
  expect(connectTrafficBatch(input, 'v1', first.checkpoint, 1)).toMatchObject({ done: true, searches: 1 });
  expect(input.search).toHaveBeenCalledTimes(2);
});
