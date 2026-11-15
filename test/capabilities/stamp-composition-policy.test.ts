import { expect, test } from 'vitest';
import { prepareStampComposition } from '../../src/capabilities/planning/stamp-composition-policy';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
test('policy pins hub and derives independent preservation anchors for other stamps', () => {
  const observation = planningObservation();
  observation.infrastructure = [{ id: 's', type: 'spawn', position: { x: 35, y: 35 }, owned: true, walkable: false }];
  const storage = { x: 25, y: 25 };
  const policy = prepareStampComposition(storage, observation, planningLimits, 20);
  expect(policy.stamps[0]!.id).toBe('hub-v1');
  expect(policy.anchorsByStamp![0]).toEqual([storage]);
  const spawn = policy.stamps.findIndex(stamp => stamp.id === 'spawn-0-v1');
  expect(policy.anchorsByStamp![spawn]![0]).toEqual({ x: 35, y: 35 });
  expect(policy.anchorsByStamp![spawn]).toHaveLength(20);
  policy.anchorsByStamp![0]![0]!.x = 0;
  expect(storage.x).toBe(25);
});
