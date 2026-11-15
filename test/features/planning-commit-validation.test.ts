import { expect, test } from 'vitest';
import { createPlanningCommitValidator } from '../../src/features/planning/planning-commit-validation';
import type { PlanningValidationSnapshot } from '../../src/features/planning/planning-commit-validation';
import type { PlanState } from '../../src/features/planning/plan-model';
import { planningLimits } from '../fixtures/planning-limits';
function fixture() {
  const snapshot: PlanningValidationSnapshot = { room: 'W0N1', observationIdentity: 'obs', policyIdentity: 'policy',
    observation: { terrain: Array(2500).fill('plain'), objects: [], infrastructure: [], constraints: [] },
    limits: { ...planningLimits, rampart: Array(9).fill(2500) }, protectedTypes: ['storage'],
    barrierCosts: { rampart: 1, constructedWall: 1 }, blocksMovement: type => !['road', 'rampart'].includes(type) };
  const plan: PlanState = { room: 'W0N1', revision: 1, strategy: 'standard', entries: [
    { type: 'spawn', x: 24, y: 25, rcl: 1, priority: -430, source: 'strategy' },
    { type: 'storage', x: 25, y: 25, rcl: 4, priority: -500, source: 'strategy' },
    { type: 'rampart', x: 25, y: 25, rcl: 4, priority: -100, source: 'strategy' }],
    provenance: { candidateId: 'standard:25:25:0', strategyVersion: 'v1', observation: 'obs', policy: 'policy',
      generatedAt: 1, committedAt: 2, anchor: { x: 25, y: 25 }, transform: 0,
      bootstrap: { spawn: 'spawn:24:25', storage: 'storage:25:25' },
      costs: { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 1, migration: 3 } } };
  return { snapshot, plan };
}
test('each validation observes current availability and identity rather than cached success', () => {
  const { snapshot, plan } = fixture();
  let current: PlanningValidationSnapshot | undefined = snapshot;
  let reads = 0;
  const validate = createPlanningCommitValidator(() => { reads++; return current; });
  expect(validate(plan)).toBe(true);
  current = undefined; expect(validate(plan)).toBe(false);
  current = { ...snapshot, observationIdentity: 'new' }; expect(validate(plan)).toBe(false);
  current = { ...snapshot, policyIdentity: 'new' }; expect(validate(plan)).toBe(false);
  current = { ...snapshot, room: 'other' }; expect(validate(plan)).toBe(false);
  expect(reads).toBe(5);
});
test('fresh geometry rejects newly blocked placement even if a caller reuses an identity', () => {
  const { snapshot, plan } = fixture(), validate = createPlanningCommitValidator(() => snapshot);
  expect(validate(plan)).toBe(true);
  const terrain = [...snapshot.observation.terrain]; terrain[25 * 50 + 24] = 'wall';
  snapshot.observation = { ...snapshot.observation, terrain };
  expect(validate(plan)).toBe(false);
});
test('schema and defense are rechecked before committing', () => {
  const { snapshot, plan } = fixture(), validate = createPlanningCommitValidator(() => snapshot);
  const before = JSON.stringify(plan);
  expect(validate({ ...plan, entries: plan.entries.filter(entry => entry.type !== 'rampart') })).toBe(false);
  expect(validate({ ...plan, entries: plan.entries.map(entry => ({ ...entry, dependencies: ['missing:1:1'] })) })).toBe(false);
  expect(JSON.stringify(plan)).toBe(before);
});
