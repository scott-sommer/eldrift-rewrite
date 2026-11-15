import { expect, test } from 'vitest';
import { attachInfrastructure } from '../../src/capabilities/planning/attach-infrastructure';
import { stageStandardCore } from '../../src/capabilities/planning/standard-core';
import { validateLayoutCapacity } from '../../src/capabilities/planning/capacity-validation';
import { placementFailures } from '../../src/capabilities/planning/placement-validation';
import { planningLimits } from '../fixtures/planning-limits';
import type { AssessmentInput } from '../../src/capabilities/planning/assessment-model';
const storage = { x: 25, y: 25 };
const observation: AssessmentInput = {
  terrain: Array(2500).fill('plain'), infrastructure: [], constraints: [],
  objects: [{ id: 'c', kind: 'controller', position: { x: 40, y: 40 } },
    { id: 's1', kind: 'source', position: { x: 10, y: 10 } },
    { id: 's2', kind: 'source', position: { x: 40, y: 10 } },
    { id: 'm', kind: 'mineral', position: { x: 10, y: 40 } }],
};
test('real standard footprint composes resource and auxiliary infrastructure into a legal capacity draft', () => {
  const core = stageStandardCore(storage, 0, planningLimits)!;
  const result = attachInfrastructure(core, storage, observation, planningLimits);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.entries).toHaveLength(138);
  expect(result.missing).toEqual([]);
  expect(result.anchors).toHaveLength(10);
  expect(validateLayoutCapacity(result.entries, planningLimits)).toEqual([]);
  expect(placementFailures(result.entries, observation)).toEqual([]);
  expect(result.entries.filter(entry => entry.type === 'link').map(entry => entry.rcl).sort()).toEqual([5, 5, 6, 7, 8, 8]);
  expect(core).toHaveLength(128);
});
