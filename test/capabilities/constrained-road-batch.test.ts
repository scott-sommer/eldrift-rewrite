import { expect, test, vi } from 'vitest';
import { constrainedRoadBatch } from '../../src/capabilities/planning/constrained-road-batch';
import { constrainedRoads } from '../../src/capabilities/planning/constrained-roads';
import type { ConstrainedRoadInput } from '../../src/capabilities/planning/constrained-roads';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
function input(): ConstrainedRoadInput {
  return { storage: { x: 20, y: 20 }, anchors: [{ x: 22, y: 20 }],
    entries: [{ type: 'road', position: { x: 20, y: 21 }, rcl: 4 }],
    observation: planningObservation(), limits: planningLimits, blocksMovement: () => false,
    search: () => vi.fn((_start, goal) => ({
      path: goal.x === 22 ? [{ x: 21, y: 20 }] : [], incomplete: false, cost: goal.x === 22 ? 2 : 0 })) };
}
test('one shared budget spans traffic and core stitching with exact JSON-resumed output', () => {
  const request = input();
  const first = constrainedRoadBatch(request, 'v1', undefined, 1);
  expect(first).toMatchObject({ done: false, searches: 1 });
  if (!first.ok) throw new Error('Unexpected failure');
  const second = constrainedRoadBatch(request, 'v1', JSON.parse(JSON.stringify(first.checkpoint)), 1);
  expect(second).toMatchObject({ done: false, searches: 1, checkpoint: { stitching: { connections: [] } } });
  if (!second.ok) throw new Error('Unexpected failure');
  const third = constrainedRoadBatch(request, 'v1', JSON.parse(JSON.stringify(second.checkpoint)), 1);
  expect(third).toMatchObject({ done: true, searches: 1 });
  if (!third.ok || !third.done) throw new Error('Missing completed roads');
  expect({ ok: true, entries: third.entries, lanes: third.lanes, usableRoads: third.usableRoads })
    .toEqual(constrainedRoads(request));
  expect(constrainedRoadBatch(request, 'v1', third.checkpoint, 10)).toMatchObject({ done: true, searches: 0 });
});
test('changed observation invalidates saved traffic before further searches', () => {
  const request = input();
  const first = constrainedRoadBatch(request, 'v1', undefined, 1);
  if (!first.ok) throw new Error('Unexpected failure');
  request.observation.constraints = [{ id: 'manual-clearance', kind: 'keep-clear', position: { x: 30, y: 30 } }];
  expect(() => constrainedRoadBatch(request, 'v1', first.checkpoint, 1)).toThrow('Stale');
});
test('CPU guard suppresses searches and pending results expose no entries', () => {
  const request = input();
  const search = vi.fn();
  request.search = () => search;
  const result = constrainedRoadBatch(request, 'v1', undefined, 100, () => false);
  expect(result).toMatchObject({ ok: true, done: false, searches: 0 });
  expect(result).not.toHaveProperty('entries');
  expect(search).not.toHaveBeenCalled();
});
test('stitching failure rejects the draft without exposing a completed layout', () => {
  const request = input();
  request.search = () => (_start, goal) => ({
    path: [{ x: 21, y: 20 }], incomplete: goal.x !== 22, cost: 2 });
  const result = constrainedRoadBatch(request, 'v1', undefined, 3);
  expect(result).toMatchObject({ ok: false, target: 'core-road:0', reason: 'incomplete-search' });
  expect(result).not.toHaveProperty('entries');
});

