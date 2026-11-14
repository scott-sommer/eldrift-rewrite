import { expect, test } from 'vitest';
import { execute } from '../../../src/core/execution/execute';
const initial = { phase: 'travel', retries: 0, wakeAt: 0, expiresAt: 100 };
test('already-complete phases advance with a hard bound and a detached checkpoint', () => {
  const result = execute(initial, { travel: () => ({ status: 'transition', phase: 'work' }), work: () => ({ status: 'transition', phase: 'travel' }) }, {}, 1, 3);
  expect(result.steps).toBe(3);
  expect(result.state.phase).toBe('work');
  expect(initial.phase).toBe('travel');
});
test('blockage survives serialization and exhausts retries without busy waiting', () => {
  const handlers = { travel: () => ({ status: 'blocked' as const, retryAt: 5, reason: 'occupied' }) };
  const first = execute(initial, handlers, {}, 1, 4, 1);
  const restored = JSON.parse(JSON.stringify(first.state));
  expect(execute(restored, handlers, {}, 2).steps).toBe(0);
  expect(execute(restored, { travel: () => ({ status: 'blocked', retryAt: 8, reason: 'occupied' }) }, {}, 5, 4, 1).outcome).toEqual({ status: 'failed', reason: 'retry-limit' });
});
test('expiry, unknown phases and target failures remain explicit', () => {
  expect(execute(initial, {}, {}, 100).outcome).toEqual({ status: 'failed', reason: 'expired' });
  expect(execute(initial, {}, {}, 1).outcome).toEqual({ status: 'failed', reason: 'unknown-phase' });
  expect(execute(initial, { travel: () => ({ status: 'failed', reason: 'target-missing' }) }, {}, 1).outcome).toEqual({ status: 'failed', reason: 'target-missing' });
});

test('unknown transition at the evaluation limit fails without persisting an invalid phase', () => {
  const result = execute(initial, { travel: () => ({ status: 'transition', phase: 'missing' }) }, {}, 1, 1);
  expect(result.outcome).toEqual({ status: 'failed', reason: 'unknown-phase' });
  expect(result.state.phase).toBe('travel');
});
test.each([NaN, Infinity, -1, 0.5])('invalid clock %s never invokes handlers', tick => {
  let invoked = false;
  expect(() => execute(initial, { travel: () => { invoked = true; return { status: 'done' }; } }, {}, tick)).toThrow('Invalid execution tick');
  expect(invoked).toBe(false);
});
