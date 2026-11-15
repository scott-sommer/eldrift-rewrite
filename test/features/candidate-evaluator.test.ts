import { decodeCandidateProgress } from '../../src/features/planning/candidate-progress';
import { planningLimits } from '../fixtures/planning-limits';
import { expect, test, vi } from 'vitest';
import { createCandidateEvaluator } from '../../src/features/planning/candidate-evaluator';
import type { CandidateEvaluatorOptions } from '../../src/features/planning/candidate-evaluator';
import type { LayoutStrategy } from '../../src/features/planning/layout-strategies';
const candidate = { id: 'custom:25:25:0', strategy: 'custom', anchor: { x: 25, y: 25 }, transform: 0 as const };
function options(strategy: LayoutStrategy): CandidateEvaluatorOptions {
  return { observation: 'obs', policy: 'policy', searchRevision: 'search-v1',
    maximumSearches: 1, canContinue: () => true, tick: () => 12,
    strategies: { custom: strategy }, prepareScore: vi.fn(() => { throw new Error('Score not expected'); }) };
}
test('unknown strategies are rejected rather than falling through to constrained generation', () => {
  const advance = vi.fn();
  const evaluate = createCandidateEvaluator(options({ version: '1', advance }));
  expect(evaluate({ ...candidate, strategy: 'unknown' }, undefined)).toEqual({ status: 'rejected', reason: 'unsupported-strategy:unknown' });
  expect(advance).not.toHaveBeenCalled();
});
test('custom strategy progress resumes with its own budget and detached checkpoint', () => {
  const advance = vi.fn<LayoutStrategy['advance']>(() => ({ status: 'pending', checkpoint: { searches: 1 } }));
  const config = options({ version: '1', advance }), evaluate = createCandidateEvaluator(config);
  const first = evaluate(candidate, undefined);
  if (first.status !== 'pending') throw new Error('Missing checkpoint');
  const saved = JSON.stringify(first.checkpoint);
  evaluate(candidate, JSON.parse(saved));
  expect(advance.mock.calls).toHaveLength(2);
  const args = advance.mock.calls[1]!;
  expect(args[2]).toEqual({ searches: 1 });
  expect(args[3]).toBe(1);
  expect(args[4]).toBe(config.canContinue);
  expect(JSON.stringify(first.checkpoint)).toBe(saved);
});
test('candidate, strategy version and policy changes invalidate serialized evaluation', () => {
  const config = options({ version: '1', advance: () => ({ status: 'pending', checkpoint: {} }) });
  const first = createCandidateEvaluator(config)(candidate, undefined);
  if (first.status !== 'pending') throw new Error('Missing checkpoint');
  expect(() => createCandidateEvaluator(config)({ ...candidate, transform: 1 }, first.checkpoint)).toThrow('Stale');
  expect(() => createCandidateEvaluator({ ...config, policy: 'new' })(candidate, first.checkpoint)).toThrow('Stale');
  const updated = createCandidateEvaluator({ ...config, strategies: { custom: { ...config.strategies.custom!, version: '2' } } });
  expect(() => updated(candidate, first.checkpoint)).toThrow('Stale');
});
test('finished geometry moves to scoring without exposing an unscored proposal', () => {
  const config = options({ version: '1', advance: () => ({ status: 'complete', entries: [] }) });
  const result = createCandidateEvaluator(config)(candidate, undefined);
  expect(result.status).toBe('pending');
  if (result.status !== 'pending') throw new Error('Expected score progress');
  expect(decodeCandidateProgress(result.checkpoint)).toMatchObject({ phase: 'score', entries: [] });
  expect(config.prepareScore).not.toHaveBeenCalled();
  expect(result).not.toHaveProperty('proposal');
});
test('strategy failures retain their reason and invalid budgets fail before strategy execution', () => {
  const config = options({ version: '1', advance: () => ({ status: 'rejected', reason: 'blocked-core' }) });
  expect(createCandidateEvaluator(config)(candidate, undefined)).toEqual({ status: 'rejected', reason: 'blocked-core' });
  expect(() => createCandidateEvaluator({ ...config, maximumSearches: -1 })).toThrow('budget');
});

test('a custom geometry lacking bootstrap structures is rejected without trapping the job', () => {
  const config = options({ version: '1', advance: () => ({ status: 'complete', entries: [] }) });
  config.prepareScore = () => ({
    entries: [
      { type: 'storage', position: { x: 25, y: 25 }, rcl: 4, priority: -500 },
      { type: 'rampart', position: { x: 25, y: 25 }, rcl: 4, priority: -100 },
    ], storage: { x: 25, y: 25 }, limits: { ...planningLimits, rampart: Array(9).fill(2500) },
    observation: { terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] },
    hauling: [], serviceWeights: {}, desiredCapacity: {}, constructionCost: { storage: 1, rampart: 1 }, retirementCost: {},
    protectedTypes: ['storage'], barrierCosts: { rampart: 1, constructedWall: 1 }, blocksMovement: () => false,
    search: () => () => { throw new Error('No route search expected'); },
  });
  const evaluate = createCandidateEvaluator(config), first = evaluate(candidate, undefined);
  if (first.status !== 'pending') throw new Error('Missing score phase');
  expect(evaluate(candidate, first.checkpoint)).toMatchObject({
    status: 'rejected', reason: expect.stringContaining('bootstrap') });
});

test('score callbacks cannot mutate persisted geometry even when they fail', () => {
  const config = options({ version: '1', advance: () => ({ status: 'complete',
    entries: [{ type: 'spawn', position: { x: 25, y: 25 }, rcl: 1 }] }) });
  config.prepareScore = (_candidate, entries) => {
    entries[0]!.position.x = 0;
    throw new Error('interrupted score');
  };
  const evaluate = createCandidateEvaluator(config), first = evaluate(candidate, undefined);
  if (first.status !== 'pending') throw new Error('Expected score checkpoint');
  const snapshot = JSON.stringify(first.checkpoint);
  expect(() => evaluate(candidate, first.checkpoint)).toThrow('interrupted score');
  expect(JSON.stringify(first.checkpoint)).toBe(snapshot);
  expect(decodeCandidateProgress(first.checkpoint).entries![0]!.position.x).toBe(25);
});
