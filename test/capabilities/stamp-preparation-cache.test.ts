import { expect, test, vi } from 'vitest';
import { createStampPreparationCache } from '../../src/capabilities/planning/stamp-preparation-cache';
import { prepareStampComposition } from '../../src/capabilities/planning/stamp-composition-policy';
import { planningObservation } from '../fixtures/planning-observation';
import { planningLimits } from '../fixtures/planning-limits';
test('preparation reuses equal inputs, protects output and leaves caller input mutable', () => {
  const prepare = vi.fn(prepareStampComposition), cached = createStampPreparationCache(prepare);
  const storage = { x: 25, y: 25 }, observation = planningObservation();
  const entries = [{ type: 'storage', position: { ...storage }, rcl: 4 }];
  const first = cached(storage, observation, planningLimits, 20, entries);
  expect(cached({ ...storage }, JSON.parse(JSON.stringify(observation)), planningLimits, 20, entries)).toBe(first);
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(() => { first.anchorsByStamp![0]![0]!.x = 0; }).toThrow();
  expect(() => { first.entries[0]!.position.x = 0; }).toThrow();
  entries[0]!.position.x = 24;
  expect(cached(storage, observation, planningLimits, 20, entries)).not.toBe(first);
  expect(Object.isFrozen(storage)).toBe(false);
  expect(Object.isFrozen(observation)).toBe(false);
});
test('preparation invalidates each semantic input and cold rebuilds preserve exact order', () => {
  const prepare = vi.fn(prepareStampComposition), cached = createStampPreparationCache(prepare);
  const storage = { x: 25, y: 25 }, observation = planningObservation();
  const base = cached(storage, observation, planningLimits, 20);
  const shifted = cached({ x: 24, y: 25 }, observation, planningLimits, 20);
  expect(shifted).not.toBe(base);
  const smaller = cached(storage, observation, planningLimits, 10);
  expect(smaller).not.toBe(shifted);
  observation.constraints = [{ id: 'lock', kind: 'locked', type: 'spawn', position: { x: 23, y: 24 } }];
  const constrained = cached(storage, observation, planningLimits, 10);
  expect(constrained).not.toBe(smaller);
  const limits = { ...planningLimits, extension: [0, 0, 5, 5, 5, 5, 5, 5, 5] };
  expect(cached(storage, observation, limits, 10)).not.toBe(constrained);
  expect(cached(storage, observation, planningLimits, 20)).toEqual(
    createStampPreparationCache()(storage, observation, planningLimits, 20));
  expect(prepare).toHaveBeenCalledTimes(6);
});

