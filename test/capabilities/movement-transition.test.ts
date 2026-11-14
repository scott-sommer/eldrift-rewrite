import { describe, expect, it } from 'vitest';
import { movementTransition, stepDirection } from '../../src/capabilities/movement/transition';
describe('engine movement transition geometry', () => {
  it.each([
    ['W0N1', 48, 20, 3, 'E0N1', 0, 20],
    ['E0N1', 1, 25, 7, 'W0N1', 49, 25],
    ['W1N0', 20, 48, 5, 'W1S0', 20, 0],
    ['W1S0', 25, 1, 1, 'W1N0', 25, 49],
  ] as const)('crosses from %s', (room, x, y, direction, target, tx, ty) => {
    const origin = { room, x, y };
    const step = movementTransition(origin, direction)!;
    expect(step.landing).toEqual({ room: target, x: tx, y: ty });
    expect(step.local.room).toBe(room);
    expect(stepDirection(origin, step.local)).toBe(direction);
    expect(stepDirection(origin, step.landing)).toBe(direction);
  });
  it('moves inward and rejects out-of-room coordinates', () => {
    const origin = { room: 'E0N1', x: 0, y: 20 };
    expect(movementTransition(origin, 3)?.landing).toEqual({ ...origin, x: 1 });
    expect(movementTransition(origin, 7)).toBeUndefined();
    expect(movementTransition(origin, 1.5)).toBeUndefined();
    expect(stepDirection(origin, { ...origin, room: 'W0N1', x: 49 })).toBe(0);
  });
  it('uses engine corner precedence without claiming traversability', () => {
    expect(movementTransition({ room: 'E0S0', x: 1, y: 1 }, 8)?.landing)
      .toEqual({ room: 'W0S0', x: 49, y: 0 });
  });
});
