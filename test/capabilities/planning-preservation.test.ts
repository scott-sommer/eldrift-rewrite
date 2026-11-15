import { expect, test } from 'vitest';
import { preservationLocks, validatePlanningConstraints } from '../../src/capabilities/planning/preservation';
test('owned valuable infrastructure produces stable independent locks, excluding hostile and unselected types', () => {
  const structures = [
    { id: 's', type: 'spawn', owned: true, walkable: false, position: { x: 25, y: 25 } },
    { id: 'r', type: 'road', owned: true, walkable: true, position: { x: 24, y: 25 } },
    { id: 'enemy', type: 'spawn', owned: false, walkable: false, position: { x: 30, y: 30 } },
  ];
  const locks = preservationLocks(structures, new Set(['spawn', 'storage']));
  expect(locks).toEqual([{ id: 'preserve:s', kind: 'locked', type: 'spawn', position: { x: 25, y: 25 } }]);
  locks[0]!.position.x = 0;
  expect(structures[0]!.position.x).toBe(25);
});
test('moving a locked spawn or substituting another type fails even if the original tile is occupied', () => {
  const locks = [{ id: 'spawn', kind: 'locked' as const, type: 'spawn', position: { x: 25, y: 25 } }];
  expect(validatePlanningConstraints([{ type: 'spawn', position: { x: 26, y: 25 } },
    { type: 'extension', position: { x: 25, y: 25 } }], locks))
    .toEqual([{ id: 'spawn', reason: 'missing-lock' }]);
  expect(validatePlanningConstraints([{ type: 'spawn', position: { x: 25, y: 25 } }], locks)).toEqual([]);
});
test('clearance excludes even roads and contradictory lock/clearance cannot silently pass', () => {
  const position = { x: 25, y: 25 };
  const constraints = [
    { id: 'locked', kind: 'locked' as const, type: 'road', position },
    { id: 'clear', kind: 'keep-clear' as const, position },
  ];
  expect(validatePlanningConstraints([{ type: 'road', position }], constraints))
    .toEqual([{ id: 'clear', reason: 'occupied-clearance' }]);
  expect(validatePlanningConstraints([], constraints)).toEqual([{ id: 'locked', reason: 'missing-lock' }]);
  expect(() => validatePlanningConstraints([], [{ id: 'bad', kind: 'locked', position }])).toThrow('type');
});
