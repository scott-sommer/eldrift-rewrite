import { expect, test, vi } from 'vitest';
import { measureRouteCost } from '../../src/capabilities/planning/route-cost';
import type { RouteCostInput } from '../../src/capabilities/planning/route-cost';
function input(): RouteCostInput {
  return { start: { x: 10, y: 10 }, roads: [{ x: 11, y: 10 }],
    targets: [{ id: 'spawn', position: { x: 13, y: 10 }, weight: 8 },
      { id: 'extension', position: { x: 13, y: 11 }, weight: 1 }],
    traversable: () => true,
    search: vi.fn(() => ({ path: [{ x: 11, y: 10 }, { x: 12, y: 10 }], incomplete: false, cost: 3 })) };
}
test('measures weighted routes independently on the fixed network', () => {
  const request = input();
  const result = measureRouteCost(request);
  expect(result).toMatchObject({ ok: true, total: 27, routes: [
    { id: 'spawn', contribution: 24, steps: 2 }, { id: 'extension', contribution: 3, steps: 2 },
  ] });
  expect(request.search).toHaveBeenNthCalledWith(2, request.start, request.targets[1]!.position, request.roads);
  const reversed = measureRouteCost({ ...request, targets: [...request.targets].reverse() });
  expect(reversed).toMatchObject({ ok: true, total: 27 });
});
test('incomplete and blocked journeys cannot become finite scores', () => {
  const request = input();
  expect(measureRouteCost({ ...request, traversable: () => false })).toMatchObject({ ok: false, reason: 'blocked-path' });
  expect(measureRouteCost({ ...request, search: () => ({ path: [], incomplete: true, cost: 0 }) }))
    .toMatchObject({ ok: false, reason: 'incomplete-search' });
});
test('invalid weights, duplicate identities and overflow are rejected', () => {
  const request = input();
  expect(() => measureRouteCost({ ...request, targets: [...request.targets, request.targets[0]!] })).toThrow('Invalid route');
  expect(() => measureRouteCost({ ...request, targets: [{ ...request.targets[0]!, weight: -1 }] })).toThrow('Invalid route');
  expect(() => measureRouteCost({ ...request, targets: [{ ...request.targets[0]!, weight: Number.MAX_VALUE }] })).toThrow('overflow');
});
