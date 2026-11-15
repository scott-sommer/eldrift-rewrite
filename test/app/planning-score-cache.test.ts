import { expect, test, vi } from 'vitest';
import { createPlanningRoomCaches } from '../../src/app/planning-room-caches';
import { createPlanningScoreCache } from '../../src/app/planning-score-cache';
test('score preparations survive ticks only for the same exact observation and policy identity', () => {
  const cache = createPlanningScoreCache(), first = vi.fn(), second = vi.fn();
  const create = vi.fn(() => first);
  expect(cache('observation1:policy1', create)).toBe(first);
  expect(cache('observation1:policy1', create)).toBe(first);
  expect(create).toHaveBeenCalledTimes(1);
  expect(cache('observation2:policy1', () => second)).toBe(second);
  expect(cache('observation2:policy2', create)).toBe(first);
  expect(create).toHaveBeenCalledTimes(2);
  expect(() => cache('', create)).toThrow('identity');
});
test('room eviction or a heap reset loses score accelerators without sharing across rooms', () => {
  const rooms = createPlanningRoomCaches(1), prepare = vi.fn();
  const first = rooms('A');
  first.score('identity', () => prepare);
  const second = rooms('B');
  expect(second.score).not.toBe(first.score);
  const returned = rooms('A'), create = vi.fn(() => prepare);
  expect(returned.score('identity', create)).toBe(prepare);
  expect(create).toHaveBeenCalledTimes(1);
  expect(returned.evaluate).not.toBe(first.evaluate);
  expect(createPlanningRoomCaches()('A').score).not.toBe(returned.score);
});
