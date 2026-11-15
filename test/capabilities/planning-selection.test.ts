import { expect, test } from 'vitest';
import { rankLayout, selectLayout } from '../../src/capabilities/planning/selection';
const zero = { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 };
const weights = { hauling: 1, service: 1, capacityShortfall: 1, swamps: 1, defense: 1, migration: 1 };
const candidates = [
  { id: 'standard', costs: { ...zero, hauling: 10, migration: 2 } },
  { id: 'constrained', costs: { ...zero, hauling: 5, migration: 10 } },
];
test('configurable cost weights change viable strategy selection and expose exact contributions', () => {
  expect(selectLayout(candidates, weights, () => true, undefined, 0)?.id).toBe('standard');
  expect(selectLayout(candidates, { ...weights, hauling: 3 }, () => true, undefined, 0)?.id).toBe('constrained');
  expect(rankLayout(candidates[0]!, weights)).toEqual({
    id: 'standard', total: 12, contributions: { ...zero, hauling: 10, migration: 2 },
  });
});
test('invalid candidates never score and invalid previous plan cannot be retained by hysteresis', () => {
  const bad = { id: 'invalid', costs: { ...zero, service: NaN } };
  expect(selectLayout([...candidates, bad], weights, id => id !== 'invalid', 'invalid', 100)?.id).toBe('standard');
  expect(selectLayout(candidates, weights, () => false, undefined, 0)).toBeUndefined();
});
test('threshold must be exceeded, with stable ties independent of enumeration order', () => {
  expect(selectLayout(candidates, weights, () => true, 'constrained', 3)?.id).toBe('constrained');
  expect(selectLayout(candidates, weights, () => true, 'constrained', 2)?.id).toBe('standard');
  const tied = [{ id: 'b', costs: zero }, { id: 'a', costs: zero }];
  expect(selectLayout(tied, weights, () => true, undefined, 0)?.id).toBe('a');
  expect(selectLayout(tied.reverse(), weights, () => true, 'b', 0)?.id).toBe('b');
});
test('malformed scores, overflow and duplicate identities fail explicitly', () => {
  expect(() => rankLayout({ id: 'a', costs: { ...zero, service: Infinity } }, weights)).toThrow();
  expect(() => rankLayout({ id: 'a', costs: { ...zero, service: Number.MAX_VALUE } },
    { ...weights, service: 2 })).toThrow('overflow');
  expect(() => selectLayout([candidates[0]!, candidates[0]!], weights, () => true, undefined, 0)).toThrow('identities');
});
