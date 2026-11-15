import { expect, test, vi } from 'vitest';
import { standardDraftBatch } from '../../src/capabilities/planning/standard-draft-batch';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
test('zero-budget draft does not expose incomplete entries or search paths', () => {
  const search = vi.fn(() => vi.fn(() => ({ path: [], cost: 0, incomplete: true })));
  const input = { candidate: { anchor: { x: 25, y: 25 }, transform: 0 as const },
    observation: planningObservation(), limits: planningLimits, blocksMovement: (type: string) => type !== 'road' && type !== 'container', search };
  const result = standardDraftBatch(input, 'v1', undefined, 0);
  expect(result).toMatchObject({ ok: true, done: false, searches: 0 });
  expect(result).not.toHaveProperty('entries');
  if (!result.ok) throw new Error('fixture');
  expect(result.checkpoint.connections).toEqual([]);
  expect(() => standardDraftBatch(input, 'v2', result.checkpoint, 0)).toThrow('Stale');
});
