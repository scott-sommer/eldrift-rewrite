import { planningObservation } from '../fixtures/planning-observation';
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

test('room assessment is retained across ticks and invalidated by changed observation or eviction', () => {
  const caches = createPlanningRoomCaches(1), input = planningObservation();
  const first = caches('a').assess(input);
  expect(caches('a').assess(JSON.parse(JSON.stringify(input)))).toBe(first);
  input.constraints = [{ id: 'new', kind: 'blocked', position: { x: 25, y: 25 } }];
  expect(caches('a').assess(input)).not.toBe(first);
  caches('b');
  expect(caches('a').assess(planningObservation())).not.toBe(first);
});
