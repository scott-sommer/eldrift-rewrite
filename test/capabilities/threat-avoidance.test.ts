import { expect, test } from 'vitest';
import { threatAvoidance } from '../../src/capabilities/movement/avoidance';

test('threat radius clips room bounds, deduplicates and keeps the current tile escapable', () => {
  const threat = { room: 'W0N1', x: 0, y: 0 }, current = { room: 'W0N1', x: 1, y: 1 };
  const tiles = threatAvoidance([threat,threat],1,current);
  expect(tiles).toHaveLength(3); expect(tiles).not.toContainEqual(current);
  expect(tiles).toContainEqual({ room: 'W0N1', x: 0, y: 1 });
  expect(() => threatAvoidance([threat],50)).toThrow('budget');
  expect(() => threatAvoidance([{ ...threat,x:-1 }],1)).toThrow('position');
});
