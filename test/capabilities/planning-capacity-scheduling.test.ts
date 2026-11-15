import { expect, test } from 'vitest';
import { scheduleCapacity } from '../../src/capabilities/planning/capacity-scheduling';
import { validateLayoutCapacity } from '../../src/capabilities/planning/capacity-validation';
const limits = { link: [0, 0, 0, 0, 0, 2, 3, 4, 6] };
const fixed = [{ type: 'link', position: { x: 25, y: 25 }, rcl: 5 }];
const requests = [
  { type: 'link', position: { x: 40, y: 40 }, minimumRcl: 5, priority: -375 },
  { type: 'link', position: { x: 10, y: 10 }, minimumRcl: 6, priority: -355 },
  { type: 'link', position: { x: 15, y: 15 }, minimumRcl: 6, priority: -355 },
];
test('shared core/controller/source link capacity yields legal RCL5/6/7 progression', () => {
  const result = scheduleCapacity(requests, fixed, limits);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.entries.map(entry => entry.rcl)).toEqual([5, 6, 7]);
  expect(validateLayoutCapacity([...fixed, ...result.entries], limits)).toEqual([]);
  expect(scheduleCapacity([...requests].reverse(), fixed, limits)).toEqual(result);
});
test('future fixed placements reserve capacity, preventing later-stage overflow', () => {
  const capacity = { link: [0, 0, 0, 0, 0, 1, 1, 2, 3] };
  const result = scheduleCapacity([requests[0]!], [{ ...fixed[0]!, rcl: 6 }], capacity);
  expect(result.ok && result.entries[0]!.rcl).toBe(7);
});
test('unsatisfiable requests return no partial schedule and duplicate fixed/request positions reject', () => {
  const capacity = { link: [0, 0, 0, 0, 0, 1, 1, 1, 1] };
  expect(scheduleCapacity(requests, fixed, capacity)).toEqual({ ok: false, type: 'link', position: { x: 40, y: 40 } });
  expect(() => scheduleCapacity([{ ...requests[0]!, position: fixed[0]!.position }], fixed, limits)).toThrow('Duplicate');
  expect(requests[0]!.minimumRcl).toBe(5);
});
