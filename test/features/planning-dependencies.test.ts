import { expect, test } from 'vitest';
import { blockedPlanPlacements, placementKey } from '../../src/features/planning/dependencies';
import { planSchema } from '../../src/features/planning/plan-state';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState } from '../../src/persistence/versioned-state';
import type { PlanEntry } from '../../src/features/planning/plan-model';
const road: PlanEntry = { type: 'road', x: 10, y: 10, rcl: 1, priority: 0, source: 'strategy' };
const extension: PlanEntry = { type: 'extension', x: 11, y: 10, rcl: 2, priority: 1, source: 'strategy', dependencies: [placementKey(road)] };
const plan = (entries: PlanEntry[]) => ({ room: 'W0N1', revision: 1, strategy: 'test', entries });
const schema = planSchema('W0N1', ['road', 'extension']);
test('dependencies require actual prerequisite completion and controller eligibility', () => {
  expect([...blockedPlanPlacements([road, extension], new Set(), 2)]).toEqual([placementKey(extension)]);
  expect([...blockedPlanPlacements([road, extension], new Set([placementKey(road)]), 2)]).toEqual([]);
  expect([...blockedPlanPlacements([road, extension], new Set([placementKey(road)]), 1)]).toEqual([placementKey(extension)]);
});
test('plan validation rejects missing dependencies, cycles, self references and duplicate edges', () => {
  expect(schema.valid(plan([road, extension]))).toBe(true);
  for (const entries of [[extension], [{ ...road, dependencies: [placementKey(extension)] }, extension],
    [{ ...road, dependencies: [placementKey(road)] }], [road, { ...extension, dependencies: [placementKey(road), placementKey(road)] }]]) {
    expect(schema.valid(plan(entries))).toBe(false);
  }
});
test('version one plans migrate without inventing dependencies or losing operator priorities', () => {
  const port = createMemoryPort(() => memory);
  const memory = {};
  const previous = plan([{ ...road, priority: -100, source: 'operator' }]);
  port.write('planning/W0N1', { owner: 'planning', version: 1, data: previous });
  expect(openState(port, 'planning/W0N1', schema)).toEqual(previous);
  expect(port.read('planning/W0N1')).toMatchObject({ version: 3, data: previous });
});
