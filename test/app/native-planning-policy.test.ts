import { afterEach, expect, test, vi } from 'vitest';
import { nativePlanningPolicy } from '../../src/app/native-planning-policy';
import { resolveConfig } from '../../src/config/resolve';
import { createNativePlanningFeature } from '../../src/app/native-planning';
import { createRuntime } from '../../src/app/runtime';
afterEach(() => vi.unstubAllGlobals());
test('native policy maps resolved tuning and binds scoring mechanics to its revision', () => {
  vi.stubGlobal('CONTROLLER_STRUCTURES', { spawn: { 8: 3 } });
  vi.stubGlobal('CONSTRUCTION_COST', { spawn: 15000 });
  const config = resolveConfig({ roomOverride: { planningHaulingWeight: 2, planningServiceWeight: 3,
    planningCapacityWeight: 4, planningSwampWeight: 5, planningDefenseWeight: 6, planningMigrationWeight: 7,
    planningMinimumImprovement: 12, planningMaximumPathOps: 5000 } }, 1).values;
  const policy = nativePlanningPolicy('W0N1', config);
  expect(policy.weights).toEqual({ hauling: 2, service: 3, capacityShortfall: 4, swamps: 5, defense: 6, migration: 7 });
  expect(policy.defense).toBeDefined();
  expect(nativePlanningPolicy('W0N1', { ...config, planningDefenseStrategy: 'legacy' }).defense).toBeUndefined();
  expect(policy.minimumImprovement).toBe(12);
  expect(policy.maximumPathOps).toBe(5000);
  expect(nativePlanningPolicy('W0N1', { ...config, planningMaximumPathOps: 5001 }).scoreRevision).not.toBe(policy.scoreRevision);
  expect(() => resolveConfig({ empire: { planningMigrationWeight: -1 } }, 1)).toThrow();
  expect(() => resolveConfig({ empire: { planningMaximumPathOps: 0 } }, 1)).toThrow();
});
test('registered planning defaults off without reading native policy or persistent planner state', () => {
  const state = { read: vi.fn(), write: vi.fn() }, readConfig = vi.fn();
  const feature = createNativePlanningFeature(state, readConfig);
  const runtime = createRuntime([feature], {
    observations: { visibleRooms: () => ['W0N1'], observeRoom: name => ({ name, owned: true, units: [], structures: [] }) },
    config: () => ({}), clock: () => ({ tick: 1, tickLimit: 100, bucket: 10000 }),
    usedCpu: () => 0, reportFailure: vi.fn(),
  });
  expect(runtime.tick().failures).toEqual([]);
  expect(readConfig).not.toHaveBeenCalled();
  expect(state.read).not.toHaveBeenCalled();
  expect(state.write).not.toHaveBeenCalled();
});
