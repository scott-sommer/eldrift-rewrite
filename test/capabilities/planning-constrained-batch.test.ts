import { expect, test } from 'vitest';
import { constrainedCandidateBatch } from '../../src/capabilities/planning/constrained-candidate-batch';
import { constrainedAnchors } from '../../src/capabilities/planning/constrained-anchors';
import { constrainedFootprint } from '../../src/capabilities/planning/constrained-footprint';
import { standardCandidateBatch } from '../../src/capabilities/planning/standard-candidate-batch';
import type { CandidateCheckpoint } from '../../src/capabilities/planning/candidate-batch';
import type { CoreCandidate } from '../../src/capabilities/planning/standard-candidates';
import type { TransformIndex } from '../../src/core/geometry/transforms';
const options = { controller: { x: 40, y: 40 }, preferred: [{ x: 2, y: 2 }, { x: 25, y: 25 }], limit: 10 };
test('constrained batches resume exact anchor/orientation order across every JSON checkpoint', () => {
  const expected = constrainedAnchors(options).flatMap(anchor =>
    Array.from({ length: 8 }, (_, transform) => ({ anchor, transform: transform as TransformIndex })))
    .filter(candidate => constrainedFootprint(candidate.anchor, candidate.transform));
  let checkpoint: CandidateCheckpoint | undefined;
  const actual: CoreCandidate[] = [];
  for (;;) {
    const batch = constrainedCandidateBatch(options, checkpoint, 3);
    expect(batch.attempts).toBeLessThanOrEqual(3);
    actual.push(...batch.candidates);
    checkpoint = JSON.parse(JSON.stringify(batch.checkpoint));
    if (batch.done) break;
  }
  expect(actual).toEqual(expected);
  expect(checkpoint!.next).toBe(80);
});
test('both strategies share budget semantics without accepting each others checkpoints', () => {
  const batch = constrainedCandidateBatch(options, undefined, 5);
  expect(constrainedCandidateBatch(options, batch.checkpoint, 10, () => false))
    .toMatchObject({ attempts: 0, candidates: [], checkpoint: batch.checkpoint });
  expect(() => standardCandidateBatch({ structures: [] }, batch.checkpoint, 1)).toThrow('Stale');
  expect(() => constrainedCandidateBatch({ ...options, limit: 11 }, batch.checkpoint, 1)).toThrow('Stale');
});
