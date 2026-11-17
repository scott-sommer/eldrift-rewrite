import { expect, test } from 'vitest';
import { defenseAccess } from '../../src/capabilities/planning/defense-access';
test('repair range reaches blocked barrier targets without granting friendly passage', () => {
  const walkable = Array<boolean>(2500).fill(false);
  walkable[25 * 50 + 25] = true;
  const result = defenseAccess(walkable, [{ x: 25, y: 25 }], 3);
  expect(result.friendlyReachable.filter(Boolean)).toHaveLength(1);
  expect(result.repairReachable[28 * 50 + 28]).toBe(true);
  expect(result.repairReachable[29 * 50 + 25]).toBe(false);
  expect(result.friendlyReachable[28 * 50 + 28]).toBe(false);
});
test('eight-way friendly access stays within connected walkable regions', () => {
  const walkable = Array<boolean>(2500).fill(false);
  for (let n = 10; n <= 20; n++) walkable[n * 50 + n] = true;
  walkable[40 * 50 + 40] = true;
  const before = [...walkable];
  const result = defenseAccess(walkable, [{ x: 10, y: 10 }, { x: 10, y: 10 }], 0);
  expect(result.friendlyReachable.filter(Boolean)).toHaveLength(11);
  expect(result.repairReachable).toEqual(result.friendlyReachable);
  expect(walkable).toEqual(before);
  expect(defenseAccess(walkable, [], 3).repairReachable.some(Boolean)).toBe(false);
});
test('invalid origins, masks and range fail explicitly', () => {
  const walkable = Array<boolean>(2500).fill(false);
  expect(() => defenseAccess(walkable, [{ x: 25, y: 25 }], 3)).toThrow('origin');
  expect(() => defenseAccess([], [], 3)).toThrow('walkability');
  expect(() => defenseAccess(walkable, [], -1)).toThrow('range');
});
