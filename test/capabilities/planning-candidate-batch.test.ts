import { expect, test } from 'vitest';
import { standardCandidates } from '../../src/capabilities/planning/standard-candidates';
import type { CandidateSeeds, CoreCandidate } from '../../src/capabilities/planning/standard-candidates';
import { standardCandidateBatch } from '../../src/capabilities/planning/standard-candidate-batch';
import type { CandidateCheckpoint } from '../../src/capabilities/planning/standard-candidate-batch';
const seeds: CandidateSeeds = { previous: { anchor: { x: 25, y: 25 }, transform: 3 },
  storage: { x: 25, y: 25 }, structures: [
    { type: 'spawn', position: { x: 20, y: 20 } }, { type: 'lab', position: { x: 1, y: 1 } },
    { type: 'road', position: { x: 10, y: 10 } }] };
test('bounded JSON-resumed batches retain exact eager legacy order and deduplication', () => {
  let checkpoint: CandidateCheckpoint | undefined;
  const candidates: CoreCandidate[] = [];
  for (;;) {
    const before = JSON.stringify(checkpoint);
    const batch = standardCandidateBatch(seeds, checkpoint, 7);
    expect(batch.attempts).toBeLessThanOrEqual(7);
    expect(JSON.stringify(checkpoint)).toBe(before);
    candidates.push(...batch.candidates);
    checkpoint = JSON.parse(JSON.stringify(batch.checkpoint));
    if (batch.done) break;
  }
  expect(candidates).toEqual(standardCandidates(seeds));
});
test('CPU guard stops before consuming the next candidate', () => {
  let remaining = 3;
  const batch = standardCandidateBatch(seeds, undefined, 100, () => remaining-- > 0);
  expect(batch.attempts).toBe(3);
  expect(batch.checkpoint.next).toBe(3);
  const stopped = standardCandidateBatch(seeds, batch.checkpoint, 10, () => false);
  expect(stopped.checkpoint).toEqual(batch.checkpoint);
  expect(stopped.candidates).toEqual([]);
});
test('seed changes invalidate checkpoints rather than silently skipping candidates', () => {
  const batch = standardCandidateBatch(seeds, undefined, 2);
  expect(() => standardCandidateBatch({ structures: [] }, batch.checkpoint, 2)).toThrow('Stale');
  expect(() => standardCandidateBatch(seeds, { ...batch.checkpoint, next: -1 }, 2)).toThrow('checkpoint');
  expect(() => standardCandidateBatch(seeds, undefined, -1)).toThrow('budget');
});
test('zero budget preserves progress and completed checkpoints are idempotent', () => {
  expect(standardCandidateBatch(seeds, undefined, 0).attempts).toBe(0);
  const complete = standardCandidateBatch(seeds, undefined, 100000);
  expect(complete.done).toBe(true);
  expect(standardCandidateBatch(seeds, complete.checkpoint, 10)).toMatchObject({ done: true, attempts: 0, candidates: [] });
});
