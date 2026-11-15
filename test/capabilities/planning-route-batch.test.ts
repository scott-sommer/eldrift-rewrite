import { expect, test, vi } from 'vitest';
import { measureRouteBatch } from '../../src/capabilities/planning/route-cost-batch';
import { measureRouteCost } from '../../src/capabilities/planning/route-cost';
import type { RouteCostInput } from '../../src/capabilities/planning/route-cost';
function input(): RouteCostInput {
  return { start: { x: 10, y: 10 }, roads: [], targets: [
    { id: 'a', position: { x: 12, y: 10 }, weight: 8 }, { id: 'b', position: { x: 12, y: 11 }, weight: 1 }],
    traversable: () => true,
    search: vi.fn(() => ({ path: [{ x: 11, y: 10 }], incomplete: false, cost: 2 })) };
}
test('JSON-resumed measurements match uninterrupted costs without replaying completed searches', () => {
  const request = input(), first = measureRouteBatch(request, 'network-v1', undefined, 1);
  expect(first).toMatchObject({ ok: true, done: false, searches: 1 });
  expect(first).not.toHaveProperty('total');
  const saved = JSON.parse(JSON.stringify(first.checkpoint));
  const final = measureRouteBatch(request, 'network-v1', saved, 1);
  expect(final).toMatchObject({ ok: true, done: true, total: 18 });
  expect(request.search).toHaveBeenCalledTimes(2);
  const full = measureRouteCost(request);
  if (!full.ok) throw new Error('fixture');
  expect(final.checkpoint.routes).toEqual(full.routes);
  expect(saved.routes).toHaveLength(1);
});
test('failure leaves failed destination pending and never emits a successful total', () => {
  const request = input(), first = measureRouteBatch(request, 'v1', undefined, 1);
  const failed = measureRouteBatch({ ...request, search: () => ({ path: [], incomplete: true, cost: 0 }) }, 'v1', first.checkpoint, 1);
  expect(failed).toMatchObject({ ok: false, target: 'b', reason: 'incomplete-search', searches: 1 });
  expect(failed.checkpoint.routes).toHaveLength(1);
  expect(failed).not.toHaveProperty('total');
});
test('CPU yielding and interrupted searches do not consume pending work', () => {
  const request = input(), first = measureRouteBatch(request, 'v1', undefined, 1);
  expect(measureRouteBatch(request, 'v1', first.checkpoint, 20, () => false))
    .toMatchObject({ done: false, searches: 0, checkpoint: first.checkpoint });
  const saved = JSON.stringify(first.checkpoint);
  expect(() => measureRouteBatch({ ...request, search: () => { throw new Error('interrupted'); } }, 'v1', first.checkpoint, 1)).toThrow('interrupted');
  expect(JSON.stringify(first.checkpoint)).toBe(saved);
});
test('network changes and corrupted persisted measurements cannot reuse old scores', () => {
  const request = input(), first = measureRouteBatch(request, 'v1', undefined, 1);
  expect(() => measureRouteBatch(request, 'v2', first.checkpoint, 1)).toThrow('Stale');
  const corrupt = { ...first.checkpoint, routes: [{ ...first.checkpoint.routes[0]!, contribution: 0 }] };
  expect(() => measureRouteBatch(request, 'v1', corrupt, 1)).toThrow('measurement');
  expect(() => measureRouteBatch(request, '', undefined, 1)).toThrow('revision');
});
