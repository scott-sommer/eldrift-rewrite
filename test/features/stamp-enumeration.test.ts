import { expect, test } from 'vitest';
import { enumeratePlanningCandidates } from '../../src/features/planning/candidate-enumeration';
import { compactEnumeration, validCompactEnumeration } from '../../src/features/planning/compact-enumeration';
test('stamp hubs enumerate once per anchor and survive compact serialized resumption', () => {
  const options = { stamps: { controller: { x: 40, y: 40 }, preferred: [{ x: 25, y: 25 }], limit: 3 } };
  let result = enumeratePlanningCandidates(options, undefined, 1);
  expect(result.done).toBe(false);
  result = enumeratePlanningCandidates(options, JSON.parse(JSON.stringify(result.checkpoint)), 2);
  expect(result.done).toBe(true);
  expect(result.checkpoint.candidates).toHaveLength(3);
  expect(result.checkpoint.candidates.every(candidate => candidate.strategy === 'stamps' && candidate.transform === 0)).toBe(true);
  const compact = compactEnumeration(result.checkpoint);
  expect(validCompactEnumeration(compact)).toBe(true);
  compact.candidates[0] = 'stamps:25:25:1';
  compact.stamps!.seen[0] = '25:25:1';
  expect(validCompactEnumeration(compact)).toBe(false);
});
test('stamp enumeration shares the attempt budget after existing strategies', () => {
  const seed = { controller: { x: 40, y: 40 }, preferred: [{ x: 25, y: 25 }], limit: 1 };
  const first = enumeratePlanningCandidates({ constrained: seed, stamps: seed }, undefined, 8);
  expect(first.done).toBe(false);
  expect(first.checkpoint.candidates).toHaveLength(8);
  const next = enumeratePlanningCandidates({ constrained: seed, stamps: seed }, first.checkpoint, 1);
  expect(next.done).toBe(true);
  expect(next.checkpoint.candidates.at(-1)?.id).toBe('stamps:25:25:0');
});
