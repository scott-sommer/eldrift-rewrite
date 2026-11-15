import { expect, test, vi } from 'vitest';
import { createLayoutStrategies } from '../../src/features/planning/layout-strategies';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
function input() {
  return { observation: planningObservation(), limits: planningLimits,
    blocksMovement: (type: string) => type !== 'road',
    search: vi.fn(() => () => ({ path: [], incomplete: true, cost: 0 })) };
}
const candidate = { id: 'stamps:25:25:0', strategy: 'stamps', anchor: { x: 25, y: 25 }, transform: 0 as const };
test('stamp registration is explicit and preserves the existing strategy adapters', () => {
  expect(Object.keys(createLayoutStrategies(input(), { standard: 's1', constrained: 'c1' }))).toEqual(['standard', 'constrained']);
  const registry = createLayoutStrategies(input(), { standard: 's1', constrained: 'c1', stamps: 'p1' }, [],
    { anchorLimit: 10, attemptsPerStep: 0, totalAttempts: 100 });
  expect(registry.stamps!.version).toBe('p1');
  expect(registry.stamps!.advance(candidate, 'revision', undefined, 0, () => true)).toMatchObject({ status: 'pending' });
});
test('registered stamp strategy resumes and rejects unsupported outer transforms explicitly', () => {
  const registry = createLayoutStrategies(input(), { standard: 's1', constrained: 'c1', stamps: 'p1' }, [],
    { anchorLimit: 20, attemptsPerStep: 1, totalAttempts: 100 });
  const first = registry.stamps!.advance(candidate, 'revision', undefined, 0, () => true);
  expect(first.status).toBe('pending');
  if (first.status !== 'pending') throw new Error('Expected progress');
  const second = registry.stamps!.advance(candidate, 'revision', JSON.parse(JSON.stringify(first.checkpoint)), 0, () => true);
  expect(second).toMatchObject({ status: 'pending', checkpoint: { composition: { totalAttempts: 2 } } });
  expect(registry.stamps!.advance({ ...candidate, transform: 1 }, 'revision', undefined, 0, () => true))
    .toMatchObject({ status: 'rejected', reason: 'stamp-candidate-transform-must-be-zero' });
});

test('locked storage rejects incompatible hubs before spending composition or route budget', () => {
  const request = input();
  request.observation.constraints = [{ id: 'storage', kind: 'locked', type: 'storage', position: { x: 26, y: 25 } }];
  const registry = createLayoutStrategies(request, { standard: 's1', constrained: 'c1', stamps: 'p1' }, [],
    { anchorLimit: 200, attemptsPerStep: 0, totalAttempts: 100000 });
  expect(registry.stamps!.advance(candidate, 'v1', undefined, 0, () => true)).toEqual({
    status: 'rejected', reason: 'stamp-hub-conflicts-with-locked-storage' });
  expect(request.search).not.toHaveBeenCalled();
  request.observation.constraints[0]!.position.x = 25;
  expect(registry.stamps!.advance(candidate, 'v2', undefined, 0, () => true)).toMatchObject({ status: 'pending' });
});
