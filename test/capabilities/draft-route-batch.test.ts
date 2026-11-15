import { expect, test, vi } from 'vitest';
import { draftRouteBatch } from '../../src/capabilities/planning/draft-route-batch';
import { draftRouteCosts } from '../../src/capabilities/planning/draft-route-costs';
import type { DraftRouteCostsInput } from '../../src/capabilities/planning/draft-route-costs';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
function input(): DraftRouteCostsInput {
  return { storage: { x: 20, y: 20 }, observation: planningObservation(), limits: planningLimits,
    entries: [{ type: 'spawn', position: { x: 22, y: 20 }, rcl: 1 }],
    hauling: [{ id: 'source', position: { x: 22, y: 20 }, weight: 2 }], serviceWeights: { spawn: 3 },
    blocksMovement: type => type === 'spawn',
    search: () => () => ({ path: [{ x: 21, y: 20 }], incomplete: false, cost: 2 }) };
}
test('one budget spans hauling and service with exact resumed score breakdowns', () => {
  const request = input();
  const first = draftRouteBatch(request, 'v1', undefined, 1);
  expect(first).toMatchObject({ ok: true, done: false, searches: 1 });
  expect(first).not.toHaveProperty('hauling');
  if (!first.ok) throw new Error('Unexpected failure');
  const saved = JSON.stringify(first.checkpoint);
  const second = draftRouteBatch(request, 'v1', JSON.parse(saved), 1);
  expect(second).toMatchObject({ done: true, searches: 1, hauling: { total: 4 }, service: { total: 6 } });
  if (!second.ok || !second.done) throw new Error('Missing scores');
  expect({ ok: true, hauling: second.hauling, service: second.service }).toEqual(draftRouteCosts(request));
  expect(JSON.stringify(first.checkpoint)).toBe(saved);
  expect(draftRouteBatch(request, 'v1', second.checkpoint, 1)).toMatchObject({ done: true, searches: 0 });
});
test('changed scoring weights and terrain invalidate an unfinished measurement', () => {
  const request = input(), first = draftRouteBatch(request, 'v1', undefined, 1);
  if (!first.ok) throw new Error('Unexpected failure');
  expect(() => draftRouteBatch({ ...request, serviceWeights: { spawn: 4 } }, 'v1', first.checkpoint, 1)).toThrow('Stale');
  const terrain = [...request.observation.terrain]; terrain[0] = 'wall';
  expect(() => draftRouteBatch({ ...request, observation: { ...request.observation, terrain } },
    'v1', first.checkpoint, 1)).toThrow('Stale');
});
test('late failed service route never exposes completed layout costs', () => {
  const request = input(), first = draftRouteBatch(request, 'v1', undefined, 1);
  if (!first.ok) throw new Error('Unexpected failure');
  request.search = () => () => ({ path: [], incomplete: true, cost: 0 });
  const failed = draftRouteBatch(request, 'v1', first.checkpoint, 1);
  expect(failed).toMatchObject({ ok: false, phase: 'service', reason: 'incomplete-search' });
  expect(failed).not.toHaveProperty('hauling');
});
test('guard prevents searches and empty journeys complete without searches', () => {
  const request = input(), search = vi.fn();
  request.search = () => search;
  expect(draftRouteBatch(request, 'v1', undefined, 2, () => false)).toMatchObject({ done: false, searches: 0 });
  expect(search).not.toHaveBeenCalled();
  expect(draftRouteBatch({ ...request, hauling: [], serviceWeights: {} }, 'v1', undefined, 0))
    .toMatchObject({ done: true, searches: 0, hauling: { total: 0 }, service: { total: 0 } });
});

test('failure reports every search consumed across the phase boundary', () => {
  const request = input();
  const search = vi.fn().mockReturnValueOnce({ path: [{ x: 21, y: 20 }], incomplete: false, cost: 2 })
    .mockReturnValue({ path: [], incomplete: true, cost: 0 });
  request.search = () => search;
  expect(draftRouteBatch(request, 'v1', undefined, 2)).toMatchObject({ ok: false, phase: 'service', searches: 2 });
  expect(search).toHaveBeenCalledTimes(2);
});
