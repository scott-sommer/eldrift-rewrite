import { expect, test, vi } from 'vitest';
import { createAssessmentCache } from '../../src/capabilities/planning/assessment-cache';
import { assessRoom } from '../../src/capabilities/planning/assessment';
import { planningObservation } from '../fixtures/planning-observation';
test('equivalent observations reuse a frozen assessment without retaining caller objects', () => {
  const build = vi.fn(assessRoom);
  const assess = createAssessmentCache(build);
  const input = planningObservation();
  const first = assess(input);
  expect(assess(JSON.parse(JSON.stringify(input)))).toBe(first);
  expect(build).toHaveBeenCalledTimes(1);
  expect(Object.isFrozen(first.walkable)).toBe(true);
  expect(Object.isFrozen(first.access[0]!.position)).toBe(true);
  expect(() => { first.walkable[0] = false; }).toThrow();
  expect(Object.isFrozen(input.objects[0]!.position)).toBe(false);
  expect(assess(input)).toEqual(assessRoom(input));
});
test('in-place terrain, object, constraint, ownership and policy edits invalidate the cache', () => {
  const build = vi.fn(assessRoom);
  const assess = createAssessmentCache(build);
  const input = planningObservation();
  const edits = [
    () => { input.terrain = [...input.terrain]; (input.terrain as string[])[1234] = 'wall'; },
    () => { input.objects[0]!.position.x--; },
    () => { input.constraints = [{ id: 'blocked', kind: 'blocked' as const, position: { x: 20, y: 20 } }]; },
    () => { input.infrastructure = [{ id: 'spawn', type: 'spawn', position: { x: 25, y: 25 }, owned: true, walkable: false }]; },
    () => { input.infrastructure[0]!.owned = false; },
    () => { input.costs = { plain: 4, swamp: 8 }; },
    () => { input.margin = 3; },
  ];
  let previous = assess(input);
  for (const edit of edits) {
    edit();
    const next = assess(input);
    expect(next).not.toBe(previous);
    expect(next).toEqual(assessRoom(input));
    previous = next;
  }
  expect(build).toHaveBeenCalledTimes(edits.length + 1);
});
test('single-entry eviction, fresh runtime and failed builds never return a stale observation', () => {
  const build = vi.fn(assessRoom);
  const assess = createAssessmentCache(build);
  const a = planningObservation(), b = { ...planningObservation(), margin: 3 };
  assess(a); assess(b); assess(a);
  expect(build).toHaveBeenCalledTimes(3);
  expect(() => assess({ ...a, terrain: [] })).toThrow('Invalid terrain');
  expect(assess(a)).toEqual(assessRoom(a));
  expect(build).toHaveBeenCalledTimes(4);
  const fresh = createAssessmentCache(build);
  expect(fresh(a)).toEqual(assess(a));
  expect(build).toHaveBeenCalledTimes(5);
});
