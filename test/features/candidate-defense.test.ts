import { expect, test, vi } from 'vitest';
import { createCandidateEvaluator } from '../../src/features/planning/candidate-evaluator';
import type { CandidateEvaluatorOptions } from '../../src/features/planning/candidate-evaluator';
import { decodeCandidateProgress } from '../../src/features/planning/candidate-progress';
import type { CandidateDefense } from '../../src/features/planning/candidate-defense';
const candidate = { id: 'custom', strategy: 'custom', anchor: { x: 25, y: 25 }, transform: 0 as const };
function options(defense: CandidateDefense): CandidateEvaluatorOptions {
  return { observation: 'obs', policy: 'policy', searchRevision: 'roads', maximumSearches: 1,
    tick: () => 1, canContinue: () => true, defense,
    strategies: { custom: { version: '1', advance: () => ({ status: 'complete',
      entries: [{ type: 'spawn', position: { x: 25, y: 25 }, rcl: 1 }] }) } },
    prepareScore: vi.fn(() => { throw new Error('Score reached'); }) };
}
function pending(result: ReturnType<ReturnType<typeof createCandidateEvaluator>>) {
  if (result.status !== 'pending') throw new Error('Expected checkpoint');
  return JSON.parse(JSON.stringify(result.checkpoint));
}
test('defense progress survives evaluator recreation and blocks scoring until completed', () => {
  const advance = vi.fn<CandidateDefense['advance']>()
    .mockReturnValueOnce({ status: 'pending', checkpoint: { cursor: 7 } })
    .mockImplementationOnce((_candidate, entries, checkpoint) => {
      expect(checkpoint).toEqual({ cursor: 7 });
      return { status: 'complete', entries: [...entries,
        { type: 'rampart', position: { x: 25, y: 25 }, rcl: 6 }] };
    });
  const config = options({ revision: 'defense-v1', advance });
  const first = pending(createCandidateEvaluator(config)(candidate, undefined));
  expect(decodeCandidateProgress(first).phase).toBe('defense');
  const second = pending(createCandidateEvaluator(config)(candidate, first));
  expect(decodeCandidateProgress(second).checkpoint).toEqual({ cursor: 7 });
  const third = pending(createCandidateEvaluator(config)(candidate, second));
  expect(decodeCandidateProgress(third)).toMatchObject({ phase: 'score', entries: expect.arrayContaining([
    expect.objectContaining({ type: 'rampart' })]) });
  expect(config.prepareScore).not.toHaveBeenCalled();
  expect(() => createCandidateEvaluator(config)(candidate, third)).toThrow('Score reached');
});
test('admission, rejection and semantic revision changes cannot bypass defense', () => {
  const advance = vi.fn<CandidateDefense['advance']>(() => ({ status: 'rejected', reason: 'unprotected-controller' }));
  const config = options({ revision: 'defense-v1', advance });
  const saved = pending(createCandidateEvaluator(config)(candidate, undefined));
  const denied = createCandidateEvaluator({ ...config, canContinue: () => false })(candidate, saved);
  expect(pending(denied)).toEqual(saved);
  expect(advance).not.toHaveBeenCalled();
  expect(() => createCandidateEvaluator({ ...config, defense: { ...config.defense!, revision: 'v2' } })(candidate, saved)).toThrow('Stale');
  expect(createCandidateEvaluator(config)(candidate, saved)).toEqual({ status: 'rejected', reason: 'unprotected-controller' });
  expect(config.prepareScore).not.toHaveBeenCalled();
});
