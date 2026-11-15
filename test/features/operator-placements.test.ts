import { expect, test, vi } from 'vitest';
import { mergeOperatorPlacements } from '../../src/features/planning/operator-placements';
import { createCandidateEvaluator } from '../../src/features/planning/candidate-evaluator';
import type { CandidateEvaluatorOptions } from '../../src/features/planning/candidate-evaluator';
import type { PlanEntry } from '../../src/features/planning/plan-model';
import { planningLimits } from '../fixtures/planning-limits';
const candidate = { id: 'custom:25:25:0', strategy: 'custom', anchor: { x: 25, y: 25 }, transform: 0 as const };
const manual: PlanEntry = { type: 'storage', x: 25, y: 25, rcl: 4, priority: -777, source: 'operator',
  tag: 'manual-storage', objectId: 'existing-storage', dependencies: ['spawn:24:25'] };
function options(): CandidateEvaluatorOptions {
  return { observation: 'obs', policy: 'policy', searchRevision: 'v1', maximumSearches: 1,
    canContinue: () => true, tick: () => 1, operatorEntries: [manual],
    strategies: { custom: { version: '1', advance: () => ({ status: 'complete', entries: [
      { type: 'spawn', position: { x: 24, y: 25 }, rcl: 1, priority: -430 },
      { type: 'storage', position: { x: 25, y: 25 }, rcl: 4, priority: -500 },
      { type: 'rampart', position: { x: 25, y: 25 }, rcl: 4, priority: -100 },
    ] }) } }, prepareScore: (_candidate, entries) => ({
      entries, storage: { x: 25, y: 25 }, limits: { ...planningLimits, rampart: Array(9).fill(2500) },
      observation: { terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] },
      hauling: [], serviceWeights: {}, desiredCapacity: {}, constructionCost: { spawn: 1, storage: 1, rampart: 1, road: 1 },
      retirementCost: {}, protectedTypes: ['storage'], barrierCosts: { rampart: 1, constructedWall: 1 },
      blocksMovement: type => !['road', 'rampart'].includes(type),
      search: () => () => { throw new Error('Unexpected route search'); },
    }) };
}
test('manual metadata replaces an exact placement and additional entries remain detached', () => {
  const generated = [{ type: 'storage', position: { x: 25, y: 25 }, rcl: 8, priority: 1 }];
  const road: PlanEntry = { type: 'road', x: 26, y: 25, rcl: 2, priority: 3, source: 'operator' };
  const result = mergeOperatorPlacements(generated, [manual, road, { ...road, x: 27, source: 'strategy' }]);
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({ priority: -777, rcl: 4, source: 'operator', dependencies: ['spawn:24:25'] });
  result[0]!.dependencies = []; result[1]!.position.x = 0;
  expect(manual.dependencies).toEqual(['spawn:24:25']);
  expect(road.x).toBe(26);
  expect(generated[0]!.rcl).toBe(8);
});
test('duplicate geometry is rejected rather than silently repaired by the merge', () => {
  const tile = { type: 'road', position: { x: 20, y: 20 }, rcl: 2 };
  expect(() => mergeOperatorPlacements([tile, tile], [])).toThrow('Duplicate draft');
  expect(() => mergeOperatorPlacements([], [manual, manual])).toThrow('Duplicate operator');
});
test('evaluation scores merged entries and retains exact metadata in its proposal', () => {
  const config = options();
  config.operatorEntries = [manual, { type: 'road', x: 26, y: 25, rcl: 2, priority: 7, source: 'operator' }];
  const prepare = config.prepareScore;
  config.prepareScore = vi.fn(prepare);
  const evaluate = createCandidateEvaluator(config), first = evaluate(candidate, undefined);
  if (first.status !== 'pending') throw new Error('Missing scoring checkpoint');
  const result = evaluate(candidate, JSON.parse(JSON.stringify(first.checkpoint)));
  if (result.status !== 'complete') throw new Error(JSON.stringify(result));
  expect(result.proposal.entries.find(entry => entry.type === 'storage')).toEqual(manual);
  expect(result.proposal.entries.find(entry => entry.type === 'road')).toMatchObject({ source: 'operator', priority: 7 });
  expect(result.proposal.provenance.costs.migration).toBe(4);
  expect(config.prepareScore).toHaveBeenCalledOnce();
});
test('a conflicting operator addition is rejected before any route searches', () => {
  const config = options(), search = vi.fn(() => { throw new Error('Should not search'); });
  const prepare = config.prepareScore;
  config.prepareScore = (...args) => ({ ...prepare(...args), search });
  config.operatorEntries = [{ type: 'terminal', x: 25, y: 25, rcl: 6, priority: 1, source: 'operator' }];
  const evaluate = createCandidateEvaluator(config), first = evaluate(candidate, undefined);
  if (first.status !== 'pending') throw new Error('Missing scoring checkpoint');
  expect(evaluate(candidate, first.checkpoint)).toMatchObject({ status: 'rejected', reason: expect.stringContaining('placement') });
  expect(search).not.toHaveBeenCalled();
});
test('operator edits invalidate saved evaluation even when caller policy is unchanged', () => {
  const config = options(), first = createCandidateEvaluator(config)(candidate, undefined);
  if (first.status !== 'pending') throw new Error('Missing checkpoint');
  config.operatorEntries = [{ ...manual, priority: -999 }];
  expect(() => createCandidateEvaluator(config)(candidate, first.checkpoint)).toThrow('Stale');
});
