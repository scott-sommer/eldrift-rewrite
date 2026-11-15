import { expect, test, vi } from 'vitest';
import { createScoreInputCache } from '../../src/features/planning/score-input-cache';
import type { EvaluateDraftInput } from '../../src/capabilities/planning/evaluate-draft';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
const candidate = { id: 'stamps:25:25:0', strategy: 'stamps', anchor: { x: 25, y: 25 }, transform: 0 as const };
function input(): EvaluateDraftInput {
  return { observation: planningObservation(), limits: planningLimits, storage: { x: 25, y: 25 },
    entries: [{ type: 'spawn', position: { x: 25, y: 25 }, rcl: 1 }], hauling: [], serviceWeights: {},
    desiredCapacity: {}, constructionCost: {}, retirementCost: {}, protectedTypes: ['spawn'],
    barrierCosts: { rampart: 1, constructedWall: 1 }, blocksMovement: () => true,
    search: () => () => ({ path: [], incomplete: false, cost: 0 }) };
}
test('score inputs are prepared once for equal candidates and entries, with detached plain results', () => {
  const source = input(), prepare = vi.fn(() => source), cached = createScoreInputCache(prepare);
  const entries = JSON.parse(JSON.stringify(source.entries));
  const first = cached(candidate, entries), expected = JSON.stringify(first);
  first.entries[0]!.position.x = 0;
  first.observation.objects[0]!.position.x = 0;
  source.storage.x = 1;
  const second = cached(JSON.parse(JSON.stringify(candidate)), JSON.parse(JSON.stringify(entries)));
  expect(JSON.stringify(second)).toBe(expected);
  expect(second.search).toBe(source.search);
  expect(prepare).toHaveBeenCalledTimes(1);
  entries[0].rcl = 2;
  cached(candidate, entries);
  cached({ ...candidate, id: 'other' }, entries);
  expect(prepare).toHaveBeenCalledTimes(3);
});
test('native hooks remain live and policy-owner reset recomputes input data', () => {
  const source = input();
  let blocked = true;
  source.blocksMovement = () => blocked;
  const prepare = vi.fn(() => source), cached = createScoreInputCache(prepare);
  expect(cached(candidate, []).blocksMovement('spawn')).toBe(true);
  blocked = false;
  expect(cached(candidate, []).blocksMovement('spawn')).toBe(false);
  createScoreInputCache(prepare)(candidate, []);
  expect(prepare).toHaveBeenCalledTimes(2);
});
