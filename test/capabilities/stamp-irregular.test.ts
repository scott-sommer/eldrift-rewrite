import { expect, test } from 'vitest';
import { prepareStampComposition } from '../../src/capabilities/planning/stamp-composition-policy';
import { composeStamps } from '../../src/capabilities/planning/stamp-composition';
import { stageStandardCore } from '../../src/capabilities/planning/standard-core';
import { placementFailures } from '../../src/capabilities/planning/placement-validation';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';

test('stamp composition relocates modules around rock outcrops that obstruct every fixed-core orientation', () => {
  const observation = planningObservation(), storage = { x: 25, y: 25 };
  const terrain = [...observation.terrain];
  for (const [x, y] of [[25, 21], [25, 29], [21, 25], [29, 25]]) terrain[y! * 50 + x!] = 'wall';
  observation.terrain = terrain;
  for (const transform of [0, 1, 2, 3, 4, 5, 6, 7] as const) {
    expect(placementFailures(stageStandardCore(storage, transform, planningLimits)!, observation).length).toBeGreaterThan(0);
  }
  const input = { ...prepareStampComposition(storage, observation, planningLimits, 200),
    revision: 'outcrops-v1', observation, limits: planningLimits, maximumTotalAttempts: 100000,
    blocksMovement: (type: string) => !['road', 'container', 'rampart'].includes(type) };
  let result = composeStamps(input, undefined, 500);
  for (let calls = 0; result.status === 'pending' && calls < 200; calls++) {
    result = composeStamps(input, JSON.parse(JSON.stringify(result.checkpoint)), 500);
  }
  expect(result.status, JSON.stringify({ total: result.checkpoint.totalAttempts, reason: result.checkpoint.lastReason })).toBe('complete');
  expect(placementFailures(result.entries!, observation)).toEqual([]);
  expect(result.entries!.filter(entry => entry.type === 'extension')).toHaveLength(60);
  expect(result.entries!.filter(entry => entry.type === 'lab')).toHaveLength(10);
}, 30000);
