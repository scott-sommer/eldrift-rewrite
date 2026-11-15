import { expect, test, vi } from 'vitest';
import { createEvaluationCache } from '../../src/capabilities/planning/evaluation-cache';
import type { EvaluateDraftInput } from '../../src/capabilities/planning/evaluate-draft';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
function input(): EvaluateDraftInput {
  return { observation: planningObservation(), limits: planningLimits, storage: { x: 25, y: 25 },
    entries: [{ type: 'spawn', position: { x: 25, y: 25 }, rcl: 1 }], hauling: [], serviceWeights: {},
    desiredCapacity: {}, constructionCost: {}, retirementCost: {}, protectedTypes: ['spawn'],
    barrierCosts: { rampart: 1, constructedWall: 1 }, blocksMovement: () => true,
    search: () => () => ({ path: [], incomplete: false, cost: 0 }) };
}
function success() {
  return { ok: true as const, defense: { ok: true as const, cost: 4, barrierTiles: 4, protectedAssets: 1 } };
}
test('equivalent candidates reuse preparation and detach returned diagnostics', () => {
  const prepare = vi.fn(success), cached = createEvaluationCache(prepare), request = input();
  const first = cached(request);
  if (!first.ok) throw new Error('Unexpected failure');
  first.defense.cost = 999;
  expect(cached({ ...request, entries: JSON.parse(JSON.stringify(request.entries)) })).toEqual(success());
  expect(prepare).toHaveBeenCalledOnce();
});
test('all hard-check dependencies invalidate cached preparation', () => {
  const prepare = vi.fn(success), cached = createEvaluationCache(prepare), original = input();
  const variants: EvaluateDraftInput[] = [
    { ...original, entries: [{ ...original.entries[0]!, rcl: 2 }] },
    { ...original, observation: { ...original.observation, margin: 3 } },
    { ...original, limits: { ...planningLimits, spawn: Array(9).fill(0) } },
    { ...original, protectedTypes: ['storage'] },
    { ...original, barrierCosts: { rampart: 2, constructedWall: 1 } },
    { ...original, blocksMovement: () => false },
  ];
  for (const variant of variants) {
    cached(original);
    const before = prepare.mock.calls.length;
    cached(variant);
    expect(prepare.mock.calls.length).toBe(before + 1);
  }
});
test('movement callback behavior invalidates even when its function identity stays the same', () => {
  let blocked = true;
  const request = { ...input(), blocksMovement: () => blocked }, prepare = vi.fn(success);
  const cached = createEvaluationCache(prepare);
  cached(request); blocked = false; cached(request);
  expect(prepare).toHaveBeenCalledTimes(2);
});
test('fresh runtime repeats checks and thrown preparation does not cache a failed result', () => {
  const request = input(), prepare = vi.fn(success);
  const cached = createEvaluationCache(prepare);
  cached(request);
  prepare.mockImplementationOnce(() => { throw new Error('interrupted'); });
  const changed = { ...request, protectedTypes: ['storage'] };
  expect(() => cached(changed)).toThrow('interrupted');
  cached(changed);
  createEvaluationCache(prepare)(changed);
  expect(prepare).toHaveBeenCalledTimes(4);
});

test('a new wall invalidates an actually validated layout rather than reusing success', () => {
  const request = input();
  request.entries = [
    { type: 'spawn', position: { x: 24, y: 25 }, rcl: 1 },
    { type: 'storage', position: { x: 25, y: 25 }, rcl: 4 },
    { type: 'rampart', position: { x: 25, y: 25 }, rcl: 4 },
  ];
  request.limits = { ...planningLimits, rampart: Array(9).fill(2500) };
  request.protectedTypes = ['storage'];
  request.blocksMovement = type => type !== 'rampart';
  const cached = createEvaluationCache();
  expect(cached(request).ok).toBe(true);
  const terrain = [...request.observation.terrain]; terrain[25 * 50 + 24] = 'wall';
  expect(cached({ ...request, observation: { ...request.observation, terrain } }))
    .toMatchObject({ ok: false, phase: 'placement' });
  expect(cached(request).ok).toBe(true);
});
