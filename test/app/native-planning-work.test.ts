import { afterEach, expect, test, vi } from 'vitest';
import { createNativePlanningWork } from '../../src/app/native-planning-work';
import type { NativePlanningPolicy } from '../../src/app/native-planning-work';
import { resolveConfig } from '../../src/config/resolve';
import { planningLimits } from '../fixtures/planning-limits';
import type { Envelope } from '../../src/persistence/versioned-state';
import type { PlanProposal } from '../../src/features/planning/plan-store';
import type { PlanningWork } from '../../src/app/planning-feature';
import { runPlanningCycle } from '../../src/features/planning/planning-cycle';
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const room = { controller: { id: 'controller', my: true, pos: { x: 40, y: 40 } },
    getTerrain: () => ({ get: () => 0 }), find: () => [] };
  for (const [key, value] of Object.entries({ Game: { rooms: { W0N1: room }, time: 2 },
    FIND_SOURCES: 1, FIND_MINERALS: 2, FIND_STRUCTURES: 3, FIND_CONSTRUCTION_SITES: 4,
    TERRAIN_MASK_WALL: 1, TERRAIN_MASK_SWAMP: 2, OBSTACLE_OBJECT_TYPES: ['spawn', 'storage'],
    CONTROLLER_STRUCTURES: { ...planningLimits, rampart: Array(9).fill(2500) } })) vi.stubGlobal(key, value);
  const data = new Map<string, Envelope>();
  const state = { read: vi.fn((key: string) => data.get(key)), write: vi.fn((key: string, value: Envelope) => data.set(key, value)) };
  const policy: NativePlanningPolicy = {
    config: resolveConfig({ empire: { planningEnabled: true, planningSearches: 0 } }, 1).values,
    valuableTypes: ['storage'], implementationRevision: 'v1', constraints: [],
    protectedTypes: ['storage'], barrierCosts: { rampart: 1, constructedWall: 1 },
    versions: { standard: 'v1', constrained: 'v1' }, searchRevision: 'v1', scoreRevision: 'v1', maximumPathOps: 10000,
    weights: { hauling: 1, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 },
    minimumImprovement: 0, prepareScore: vi.fn(() => () => { throw new Error('Unused scoring'); }),
  };
  const read = vi.fn(() => policy);
  return { state, policy, read, prepare: createNativePlanningWork(state, 'W0N1', read) };
}
function proposal(work: PlanningWork): PlanProposal {
  return { strategy: 'standard', entries: [
    { type: 'spawn', x: 24, y: 25, rcl: 1, priority: -430, source: 'strategy' },
    { type: 'storage', x: 25, y: 25, rcl: 4, priority: -500, source: 'strategy' },
    { type: 'rampart', x: 25, y: 25, rcl: 4, priority: -100, source: 'strategy' }],
  provenance: { candidateId: 'standard:25:25:0', strategyVersion: 'v1',
    observation: work.input.observation, policy: work.input.policy, generatedAt: 1,
    anchor: { x: 25, y: 25 }, transform: 0, bootstrap: { spawn: 'spawn:24:25', storage: 'storage:25:25' },
    costs: { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 1, migration: 3 } } };
}
test('native work connects current identity, both strategies, persisted completion and policy refresh', () => {
  const { prepare, policy } = setup();
  const ready = prepare(() => true);
  if (ready.status !== 'ready') throw new Error(ready.status);
  const { work } = ready, plan = proposal(work);
  expect(Object.keys(work.enumeration)).toEqual(['standard', 'constrained']);
  expect(policy.prepareScore).not.toHaveBeenCalled();
  expect(work.input.validate(plan)).toBe(true);
  expect(work.input.step({ id: 'unknown', strategy: 'unknown', anchor: { x: 25, y: 25 }, transform: 0 }, undefined))
    .toEqual({ status: 'rejected', reason: 'unsupported-strategy:unknown' });
  const result = runPlanningCycle(work.ports, { ...work.input,
    source: { revision: 'controlled-one', count: 1, at: () => ({
      id: plan.provenance.candidateId, strategy: 'standard', anchor: { x: 25, y: 25 }, transform: 0 }) },
    step: () => ({ status: 'complete', proposal: plan }),
  }, 2, 1);
  expect(result.status).toBe('finished');
  expect(prepare(() => true).status).toBe('idle');
  policy.scoreRevision = 'v2';
  expect(work.input.validate(plan)).toBe(false);
  const changed = prepare(() => true);
  if (changed.status !== 'ready') throw new Error(changed.status);
  expect(changed.work.input.baseRevision).toBe(1);
  expect(changed.work.input.previousId).toBe(plan.provenance.candidateId);
  expect(changed.work.input.policy).not.toBe(work.input.policy);
});
test('CPU rejection avoids policy/state access and invalid cost policy fails before persistence', () => {
  const { prepare, read, state, policy } = setup();
  expect(prepare(() => false)).toEqual({ status: 'deferred' });
  expect(read).not.toHaveBeenCalled(); expect(state.read).not.toHaveBeenCalled();
  policy.weights.hauling = NaN;
  expect(() => prepare(() => true)).toThrow('Invalid native planning costs');
  expect(state.write).not.toHaveBeenCalled();
});
test('operational search allowance preserves request identity while protection changes invalidate it', () => {
  const { prepare, policy } = setup();
  const first = prepare(() => true);
  if (first.status !== 'ready') throw new Error(first.status);
  policy.config = { ...policy.config, planningSearches: 2 };
  const resumed = prepare(() => true);
  if (resumed.status !== 'ready') throw new Error(resumed.status);
  expect(resumed.work.input.policy).toBe(first.work.input.policy);
  policy.protectedTypes = ['storage', 'spawn'];
  const changed = prepare(() => true);
  if (changed.status !== 'ready') throw new Error(changed.status);
  expect(changed.work.input.policy).not.toBe(first.work.input.policy);
  expect(first.work.input.validate(proposal(first.work))).toBe(false);
});
