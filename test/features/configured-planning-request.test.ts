import { expect, test } from 'vitest';
import { prepareConfiguredPlanningRequest } from '../../src/features/planning/configured-planning-request';
import { resolveConfig } from '../../src/config/resolve';
import { planningObservation } from '../fixtures/planning-observation';
import type { PlanState } from '../../src/features/planning/plan-model';
const plan: PlanState = { room: 'W0N1', revision: 0, strategy: null, entries: [] };
function request(patch: Record<string, unknown> = {}) {
  const result = prepareConfiguredPlanningRequest(planningObservation(), plan,
    resolveConfig({ roomOverride: patch }, 1).values, ['spawn', 'storage']);
  if (!result.ok) throw new Error(result.reason);
  return result;
}
test('explicit refresh changes identity while keeping candidate geometry and observations', () => {
  const original = request(), refreshed = request({ planningRefreshRevision: 1 });
  expect(refreshed.policyIdentity).not.toBe(original.policyIdentity);
  expect(refreshed.options).toEqual(original.options);
  expect(refreshed.observation).toEqual(original.observation);
  expect(request({ planningRefreshRevision: 1 }).policyIdentity).toBe(refreshed.policyIdentity);
});
test('execution budget changes do not invalidate the desired request', () => {
  expect(request({ planningCpuBudget: 20, planningCandidateAttempts: 200,
    planningEvaluationSteps: 4, planningSearches: 3 }).policyIdentity).toBe(request().policyIdentity);
});
test('resolved strategy and anchor settings drive enumeration', () => {
  const prepared = request({ layoutStrategy: 'constrained', planningAnchorLimit: 7 });
  expect(Object.keys(prepared.options)).toEqual(['constrained']);
  expect(prepared.options.constrained?.limit).toBe(7);
});
test('preservation configuration controls automatic locks without erasing infrastructure', () => {
  const observation = planningObservation();
  observation.infrastructure = [{ id: 'storage', type: 'storage', position: { x: 25, y: 25 }, owned: true, walkable: false }];
  const preserved = prepareConfiguredPlanningRequest(observation, plan, resolveConfig({}, 1).values, ['storage']);
  const relaxed = prepareConfiguredPlanningRequest(observation, plan,
    resolveConfig({ roomOverride: { planningPreserveExisting: false } }, 1).values, ['storage']);
  if (!preserved.ok || !relaxed.ok) throw new Error('Missing request');
  expect(preserved.observation.constraints).toHaveLength(1);
  expect(relaxed.observation.constraints).toEqual([]);
  expect(relaxed.observation.infrastructure).toEqual(observation.infrastructure);
  expect(relaxed.policyIdentity).not.toBe(preserved.policyIdentity);
});
