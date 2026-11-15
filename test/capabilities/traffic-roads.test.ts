import { expect, test, vi } from 'vitest';
import { connectTrafficRoads } from '../../src/capabilities/planning/traffic-roads';
import type { TrafficRoadInput } from '../../src/capabilities/planning/traffic-roads';
const primary = [{ x: 11, y: 10 }, { x: 12, y: 10 }, { x: 13, y: 10 }];
const secondary = [{ x: 11, y: 11 }, { x: 12, y: 11 }, { x: 13, y: 11 }];
function input(): TrafficRoadInput {
  return { start: { x: 10, y: 10 }, targets: [{ id: 'source', position: { x: 14, y: 10 } }],
    roads: [], traversable: () => true, buildable: () => true,
    search: vi.fn((_start, _goal, _roads, blocked) => ({ path: blocked.length ? secondary : primary, incomplete: false, cost: 3 })) };
}
test('secondary lane excludes primary interior but can share target approach', () => {
  const request = input();
  const result = connectTrafficRoads(request);
  expect(result).toMatchObject({ ok: true, lanes: [{ id: 'source', primaryCost: 3, secondaryCost: 3 }] });
  expect(request.search).toHaveBeenLastCalledWith(request.start, request.targets[0]!.position, primary, primary.slice(0, 2));
  if (result.ok) expect(result.roads).toEqual([...primary, ...secondary]);
  expect(request.roads).toEqual([]);
});
test('unavailable secondary lane retains primary and records the reason without partial roads', () => {
  const request = input();
  request.search = (_start, _goal, _roads, blocked) => ({ path: blocked.length ? secondary : primary, incomplete: blocked.length > 0, cost: 3 });
  expect(connectTrafficRoads(request)).toEqual({ ok: true, roads: primary,
    lanes: [{ id: 'source', primaryCost: 3, secondaryFailure: 'incomplete-search' }] });
});
test('a search cannot falsely report redundancy by reusing primary interior', () => {
  const request = input();
  request.search = () => ({ path: primary, incomplete: false, cost: 3 });
  expect(connectTrafficRoads(request)).toMatchObject({ ok: true,
    lanes: [{ secondaryFailure: 'blocked-path' }] });
});
test('late primary failure publishes no partial network', () => {
  const request = input();
  request.targets = [...request.targets, { id: 'controller', position: { x: 30, y: 30 } }];
  request.search = (_start, goal, _roads, blocked) => ({
    path: blocked.length ? secondary : primary, incomplete: goal.x === 30, cost: 3 });
  expect(connectTrafficRoads(request)).toEqual({ ok: false, target: 'controller', reason: 'incomplete-search' });
  expect(request.roads).toEqual([]);
});
