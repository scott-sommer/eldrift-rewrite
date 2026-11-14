import { expect, test } from 'vitest';
import { createBoundedCache } from '../../src/core/cache/bounded-cache';

test('cache evicts least recently used entries and respects exact expiry', () => {
  const cache = createBoundedCache<string, number>(2);
  cache.set('a', 1, 10);
  cache.set('b', 2, 10);
  expect(cache.get('a', 1)).toBe(1);
  cache.set('c', 3, 10);
  expect(cache.size).toBe(2);
  expect(cache.get('b', 1)).toBeUndefined();
  expect(cache.get('a', 9)).toBe(1);
  expect(cache.get('a', 10)).toBeUndefined();
});

test('discarding cache leaves durable data intact and permits reconstruction', () => {
  const persistent = { plan: { revision: 1 } };
  let cache = createBoundedCache<string, number>(1);
  const read = () => cache.get('plan', 1) ?? persistent.plan.revision;
  cache.set('plan', read(), 10);
  cache.clear();
  cache = createBoundedCache(1);
  expect(read()).toBe(1);
  expect(persistent).toEqual({ plan: { revision: 1 } });
});
