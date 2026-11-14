import { expect, test } from 'vitest';
import { createMovementDetours } from '../../src/capabilities/movement/detour';
const position = { room: 'W0N1', x: 10, y: 10 };
const view = { tick: 1, position, destination: { ...position, x: 20 }, range: 0, fatigue: 0, allowPartial: false };
test('a successful detour step does not revert to the blocked shortest route', () => {
  const detours = createMovementDetours();
  expect(detours.avoid('u', view, false)).toBe(false);
  expect(detours.avoid('u', view, true)).toBe(true);
  expect(detours.avoid('u', { ...view, tick: 2, position: { ...position, y: 9 } }, false)).toBe(true);
  expect(detours.avoid('u', { ...view, tick: 50 }, false)).toBe(true);
  detours.forget('u');
  expect(detours.avoid('u', { ...view, tick: 51 }, false)).toBe(false);
});
test('changed goals, expiry and bounded eviction discard old detours', () => {
  const detours = createMovementDetours(1);
  detours.avoid('u', view, true);
  expect(detours.avoid('u', { ...view, range: 1 }, false)).toBe(false);
  detours.avoid('u', view, true);
  expect(detours.avoid('u', { ...view, tick: 101 }, false)).toBe(false);
  detours.avoid('u', view, true);
  detours.avoid('other', view, true);
  expect(detours.avoid('u', view, false)).toBe(false);
});
