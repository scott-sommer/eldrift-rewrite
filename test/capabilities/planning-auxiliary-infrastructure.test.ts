import { expect, test } from 'vitest';
import { auxiliaryInfrastructure } from '../../src/capabilities/planning/auxiliary-infrastructure';
import { scheduleCapacity } from '../../src/capabilities/planning/capacity-scheduling';
const input = { storage: { x: 25, y: 25 }, reserved: [], available: () => true, adjacentRoads: () => 0 };
test('factory and two auxiliary links preserve metadata and reserve distinct positions', () => {
  const result = auxiliaryInfrastructure(input);
  expect(result.missing).toEqual([]);
  expect(result.entries.map(entry => [entry.type, entry.minimumRcl, entry.priority, entry.tag])).toEqual([
    ['factory', 7, -260, 'factory'], ['link', 8, -345, 'auxiliary'], ['link', 8, -345, 'auxiliary'],
  ]);
  expect(new Set(result.entries.map(entry => JSON.stringify(entry.position))).size).toBe(3);
  expect(result.entries[1]!.position).toEqual({ x: 27, y: 23 });
  expect(result.entries[0]!.position).toEqual({ x: 23, y: 25 });
  expect(result.entries[2]!.position).toEqual({ x: 23, y: 26 });
});
test('factory failure does not prevent link proposals and existing reservations are respected', () => {
  const result = auxiliaryInfrastructure({ ...input, available: type => type !== 'factory', reserved: [{ x: 27, y: 23 }] });
  expect(result.missing).toEqual(['factory:0']);
  expect(result.entries).toHaveLength(2);
  expect(result.entries.every(entry => entry.position.x !== 27 || entry.position.y !== 23)).toBe(true);
});
test('auxiliary proposals can be scheduled alongside four existing links without exceeding RCL8 capacity', () => {
  const result = auxiliaryInfrastructure(input);
  const fixed = [10, 11, 12, 13].map(x => ({ type: 'link', position: { x, y: 10 }, rcl: 7 }));
  const scheduled = scheduleCapacity(result.entries, fixed, {
    link: [0, 0, 0, 0, 0, 2, 3, 4, 6], factory: [0, 0, 0, 0, 0, 0, 0, 1, 1],
  });
  expect(scheduled.ok).toBe(true);
  if (scheduled.ok) expect(scheduled.entries.map(entry => entry.rcl)).toEqual([7, 8, 8]);
});

