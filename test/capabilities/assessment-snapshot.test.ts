import { expect, test } from 'vitest';
import { assessmentFreshness, assessmentSnapshot } from '../../src/capabilities/planning/snapshot';
import type { AssessmentInput } from '../../src/capabilities/planning/assessment-model';
const input = (): AssessmentInput => ({ terrain: Array(2500).fill('plain'),
  objects: [{ id: 'source', kind: 'source', position: { x: 10, y: 10 } }],
  infrastructure: [{ id: 'spawn', type: 'spawn', position: { x: 20, y: 20 }, owned: true, walkable: false }],
  constraints: [{ id: 'access', kind: 'keep-clear', position: { x: 21, y: 20 } },
    { id: 'locked', kind: 'locked', type: 'tower', position: { x: 22, y: 20 } }] });
test('signature ignores observation time and input ordering, normalizes default policy', () => {
  const data = input(), first = assessmentSnapshot('W0N1', data, 10);
  const reordered = { ...data, constraints: [...data.constraints].reverse(), margin: 2, costs: { plain: 1, swamp: 5 } };
  expect(assessmentSnapshot('W0N1', reordered, 20).fingerprint).toBe(first.fingerprint);
  expect(first.version).toBe(1);
  expect(first.observedAt).toBe(10);
});
test('room and all meaningful assessment changes invalidate the signature', () => {
  const original = input(), baseline = assessmentSnapshot('W0N1', original, 10).fingerprint;
  const variants: AssessmentInput[] = [
    { ...original, terrain: original.terrain.map((cell, i) => i === 1 ? 'swamp' : cell) },
    { ...original, objects: [{ ...original.objects[0]!, position: { x: 11, y: 10 } }] },
    { ...original, infrastructure: [{ ...original.infrastructure[0]!, walkable: true }] },
    { ...original, infrastructure: [{ ...original.infrastructure[0]!, owned: false }] },
    { ...original, constraints: [] }, { ...original, margin: 3 },
    { ...original, costs: { plain: 2, swamp: 10 } },
  ];
  for (const data of variants) expect(assessmentSnapshot('W0N1', data, 10).fingerprint).not.toBe(baseline);
  expect(assessmentSnapshot('E0N1', original, 10).fingerprint).not.toBe(baseline);
});
test('freshness never treats hidden or unobserved rooms as current and rejects future timestamps', () => {
  expect(assessmentFreshness(undefined, 10, false, 5)).toBe('unknown');
  expect(assessmentFreshness(10, 10, true, 5)).toBe('current');
  expect(assessmentFreshness(10, 10, false, 5)).toBe('remembered');
  expect(assessmentFreshness(5, 10, true, 5)).toBe('remembered');
  expect(assessmentFreshness(4, 10, false, 5)).toBe('stale');
  expect(() => assessmentFreshness(11, 10, true, 5)).toThrow('time');
  expect(() => assessmentFreshness(1, 10, false, -1)).toThrow('clock');
});
