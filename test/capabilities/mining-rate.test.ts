import { expect, test } from 'vitest';
import { harvestRate } from '../../src/capabilities/mining/rate';
test('harvest production counts surviving WORK and boost multipliers', () => {
  const body = [
    { type: 'work', hits: 100, multiplier: 1 },
    { type: 'work', hits: 1, multiplier: 3 },
    { type: 'work', hits: 0, multiplier: 7 },
    { type: 'move', hits: 100, multiplier: 1 },
  ];
  expect(harvestRate(body, { power: 2, interval: 1 })).toBe(8);
  expect(harvestRate(body, { power: 1, interval: 6 })).toBeCloseTo(4 / 6);
  expect(harvestRate([], { power: 2, interval: 1 })).toBe(0);
});
test('invalid production profiles fail explicitly', () => {
  expect(() => harvestRate([], { power: 1, interval: 0 })).toThrow('profile');
  expect(() => harvestRate([{ type: 'work', hits: 100, multiplier: NaN }], { power: 1, interval: 6 })).toThrow('part');
});
