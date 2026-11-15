import { expect, test } from 'vitest';
import { validScorePlacements } from '../../src/features/planning/score-placement-validation';
import { prepareStampComposition } from '../../src/capabilities/planning/stamp-composition-policy';
import { composeStamps } from '../../src/capabilities/planning/stamp-composition';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
test('full catalog composes around a fixed hub with complete service capacity', () => {
  const observation = planningObservation(), storage = { x: 25, y: 25 };
  const input = { ...prepareStampComposition(storage, observation, planningLimits, 200),
    revision: 'full-v1', observation, limits: planningLimits, maximumTotalAttempts: 10000,
    blocksMovement: (type: string) => !['road', 'container', 'rampart'].includes(type) };
  let result = composeStamps(input, undefined, 500);
  for (let calls = 0; result.status === 'pending' && calls < 20; calls++) {
    result = composeStamps(input, JSON.parse(JSON.stringify(result.checkpoint)), 500);
  }
  expect(result.status, JSON.stringify({ total: result.checkpoint.totalAttempts,
    depth: result.checkpoint.choices.length, reason: result.checkpoint.lastReason })).toBe('complete');
  expect(validScorePlacements(result.entries!, Object.keys(planningLimits))).toBe(true);
  expect(result.entries?.filter(entry => entry.type === 'extension')).toHaveLength(60);
  expect(result.entries?.filter(entry => entry.type === 'spawn')).toHaveLength(3);
  expect(result.entries?.filter(entry => entry.type === 'lab')).toHaveLength(10);
}, 30000);
