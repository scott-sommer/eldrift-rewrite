import { expect, test } from 'vitest';
import { decodeCandidateProgress, restoreCandidateProgress, saveCandidateProgress } from '../../src/features/planning/candidate-progress';
test('nested checkpoints survive JSON persistence detached from both producers and consumers', () => {
  const progress = { signature: 'candidate', phase: 'draft' as const,
    checkpoint: { roads: [{ x: 10, y: 20 }], signature: 'quotes" and backslash\\' } };
  const saved = saveCandidateProgress(progress), before = JSON.stringify(saved);
  progress.checkpoint.roads[0]!.x = 0;
  const decoded = decodeCandidateProgress(JSON.parse(before));
  expect(decoded.checkpoint).toEqual({ roads: [{ x: 10, y: 20 }], signature: 'quotes" and backslash\\' });
  (decoded.checkpoint as { roads: { x: number }[] }).roads[0]!.x = 1;
  expect(JSON.stringify(saved)).toBe(before);
  expect(restoreCandidateProgress('candidate', saved).checkpoint).not.toEqual(decoded.checkpoint);
  expect(() => restoreCandidateProgress('changed', saved)).toThrow('Stale');
});
test('legacy score and draft checkpoints upgrade without changing semantic data', () => {
  for (const progress of [
    { signature: 'candidate', phase: 'draft' as const, checkpoint: { cursor: 3 } },
    { signature: 'candidate', phase: 'score' as const, entries: [], checkpoint: { cursor: 7 } },
  ]) {
    const restored = decodeCandidateProgress({ version: 1, ...progress });
    expect(restored).toEqual(progress);
    const saved = saveCandidateProgress(restored);
    expect(saved.version).toBe(2);
    expect(decodeCandidateProgress(saved)).toEqual(progress);
  }
});
test('malformed, excessive and incompatible progress fails before consumer execution', () => {
  const valid = saveCandidateProgress({ signature: 'candidate', phase: 'draft', checkpoint: {} });
  for (const changed of [
    { version: 3 }, { phase: 'unknown' }, { signature: '' }, { payload: '{}' .repeat(1000001) },
    { payload: '[' }, { payload: 'null' }, { payload: '[]' }, { phase: 'score' },
    { payload: JSON.stringify({ checkpoint: Array(100001).fill(0) }) },
  ]) expect(() => decodeCandidateProgress({ ...valid, ...changed })).toThrow();
  const invalid: { circular?: unknown } = {};
  invalid.circular = invalid;
  expect(() => saveCandidateProgress({ signature: 'candidate', phase: 'draft', checkpoint: invalid })).toThrow('cycle');
});
