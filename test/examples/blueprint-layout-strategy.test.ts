import { expect, test } from 'vitest';
import { blueprintStrategy } from './blueprint-layout-strategy';
import { createCandidateEvaluator } from '../../src/features/planning/candidate-evaluator';
import { planningLimits } from '../fixtures/planning-limits';
import type { StampTile } from '../../src/capabilities/planning/stamp-placement';
const candidate = { id: 'blueprint:25:25:0', strategy: 'blueprint', anchor: { x: 25, y: 25 }, transform: 0 as const };
const tiles: StampTile[] = [
  { type: 'rampart', offset: { x: 0, y: 0 }, rcl: 4, priority: -100 },
  { type: 'rampart', offset: { x: -1, y: 0 }, rcl: 4, priority: -100 },
  { type: 'storage', offset: { x: 0, y: 0 }, rcl: 4, priority: -500 },
  { type: 'spawn', offset: { x: -1, y: 0 }, rcl: 1, priority: -430 },
];
function evaluator(wall = false) {
  const terrain = Array(2500).fill('plain');
  if (wall) terrain[25 * 50 + 24] = 'wall';
  return createCandidateEvaluator({
    observation: wall ? 'wall' : 'plain', policy: 'example', searchRevision: 'v1',
    maximumSearches: 1, canContinue: () => true, tick: () => 12,
    strategies: { blueprint: blueprintStrategy(tiles, 'blueprint-v1') },
    prepareScore: (_candidate, entries) => ({
      entries, storage: candidate.anchor, limits: { ...planningLimits, rampart: Array(9).fill(2500) },
      observation: { terrain, objects: [], infrastructure: [], constraints: [] },
      hauling: [], serviceWeights: {}, desiredCapacity: { spawn: 1, storage: 1 },
      constructionCost: { spawn: 1, storage: 1, rampart: 1 }, retirementCost: {},
      protectedTypes: ['storage', 'spawn'], barrierCosts: { rampart: 1, constructedWall: 1 },
      blocksMovement: type => ['spawn', 'storage'].includes(type),
      search: () => () => { throw new Error('No routes requested by this minimal example'); },
    }),
  });
}
test('custom blueprint produces a proposal through unmodified shared validation and scoring', () => {
  const evaluate = evaluator(), first = evaluate(candidate, undefined);
  if (first.status !== 'pending') throw new Error(first.status);
  const result = evaluate(candidate, JSON.parse(JSON.stringify(first.checkpoint)));
  expect(result).toMatchObject({ status: 'complete', proposal: { strategy: 'blueprint',
    provenance: { strategyVersion: 'blueprint-v1', costs: { capacityShortfall: 0, migration: 4 },
      bootstrap: { spawn: 'spawn:24:25', storage: 'storage:25:25' } } } });
});
test('shared hard validation rejects blueprint geometry on walls before scoring', () => {
  const evaluate = evaluator(true), first = evaluate(candidate, undefined);
  if (first.status !== 'pending') throw new Error(first.status);
  expect(evaluate(candidate, first.checkpoint)).toMatchObject({
    status: 'rejected', reason: expect.stringContaining('placement') });
});
test('adapter yields with detached serializable state and rejects stale work and bounds', () => {
  const strategy = blueprintStrategy(tiles, 'v1');
  const paused = strategy.advance(candidate, 'r1', undefined, 0, () => false);
  if (paused.status !== 'pending') throw new Error(paused.status);
  const saved = JSON.parse(JSON.stringify(paused.checkpoint));
  expect(strategy.advance(candidate, 'r1', saved, 0, () => true).status).toBe('complete');
  expect(saved).toEqual(paused.checkpoint);
  expect(() => strategy.advance(candidate, 'r2', saved, 0, () => true)).toThrow('Stale');
  expect(strategy.advance({ ...candidate, anchor: { x: 2, y: 2 } }, 'r1', undefined, 0, () => true))
    .toEqual({ status: 'rejected', reason: 'blueprint-out-of-bounds' });
});
