import { expect, test } from 'vitest';
import { createPlanningRoomCaches } from '../../src/app/planning-room-caches';
test('room caches retain hot rooms and evict least recently used rooms within the bound', () => {
  const cache = createPlanningRoomCaches(2);
  const a = cache('a'), b = cache('b');
  expect(cache('a')).toBe(a);
  cache('c');
  expect(cache('a')).toBe(a);
  expect(cache('b')).not.toBe(b);
  expect(createPlanningRoomCaches()('a')).not.toBe(a);
  expect(() => createPlanningRoomCaches(0)).toThrow('limit');
});
