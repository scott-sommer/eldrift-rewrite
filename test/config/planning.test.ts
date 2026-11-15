import type { PlanningFeaturePorts } from '../../src/app/planning-feature';
import { expect, test, vi } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';
import { createConfiguredPlanningFeature } from '../../src/app/configured-planning-feature';
import { createRuntime } from '../../src/app/runtime';
test('planning policy and operational settings resolve with provenance and expiry', () => {
  const input = { empire: { planningEnabled: true, planningCpuBudget: 8, planningPreserveExisting: false },
    roomOverride: { planningCandidateAttempts: 50, planningAnchorLimit: 12, planningRefreshRevision: 3 },
    temporary: { expiresAt: 2, values: { planningCpuBudget: 0, planningSearches: 0 } } };
  const config = resolveConfig(input, 1);
  expect(config.values.planningEnabled).toBe(true);
  expect(config.values.planningCpuBudget).toBe(0);
  expect(config.values.planningSearches).toBe(0);
  expect(config.values.planningCandidateAttempts).toBe(50);
  expect(config.values.planningRefreshRevision).toBe(3);
  expect(config.sources.planningCpuBudget).toBe('temporary');
  expect(config.sources.planningAnchorLimit).toBe('roomOverride');
  expect(resolveConfig(input, 2).values.planningCpuBudget).toBe(8);
  expect(resolveConfig({}, 2).values.planningEnabled).toBe(false);
});
test('invalid planning settings fail with layer context', () => {
  for (const patch of [{ planningEnabled: 1 }, { planningCpuBudget: Infinity }, { planningCpuBudget: -1 },
    { planningCandidateAttempts: 0.5 }, { planningEvaluationSteps: 10001 }, { planningSearches: -1 },
    { planningPreserveExisting: 1 }, { planningAnchorLimit: 0 }, { planningAnchorLimit: 2501 },
    { planningRefreshRevision: -1 }, { planningRefreshRevision: Number.MAX_SAFE_INTEGER + 1 }]) {
    expect(() => resolveConfig({ roomOverride: patch }, 1)).toThrow(/roomOverride/);
  }
});
test('configured scheduler feature respects per-room enablement and temporary zero CPU allowance', () => {
  let tick = 1;
  const prepare = vi.fn<PlanningFeaturePorts['prepare']>(() => undefined);
  const feature = createConfiguredPlanningFeature({ prepare, usedCpu: () => 0, tickLimit: () => 20, report: () => {} });
  const runtime = createRuntime([feature], {
    observations: { visibleRooms: () => ['a', 'b'], observeRoom: name => ({ name, owned: true, units: [], structures: [] }) },
    config: name => name === 'a' ? { roomOverride: { planningEnabled: true },
      temporary: { expiresAt: 2, values: { planningCpuBudget: 0 } } } : {},
    clock: () => ({ tick, tickLimit: 20, bucket: 10000 }), usedCpu: () => 0, reportFailure: () => {},
  });
  expect(runtime.tick().failures).toEqual([]);
  expect(prepare).not.toHaveBeenCalled();
  tick++;
  expect(runtime.tick().failures).toEqual([]);
  expect(prepare).toHaveBeenCalledOnce();
  expect(prepare.mock.calls[0]?.[0].room.name).toBe('a');
});
