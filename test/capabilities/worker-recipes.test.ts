import { expect, test } from 'vitest';
import { builderBody, upgraderBody } from '../../src/capabilities/spawning/worker-recipes';
import type { BodyPlan } from '../../src/capabilities/spawning/body';
const counts = (plan: BodyPlan | undefined) => ['work', 'carry', 'move'].map(part => plan?.parts.filter(item => item === part).length ?? 0);
test('builders preserve legacy body tiers and cap ordinary growth', () => {
  expect(builderBody(249)).toBeUndefined();
  expect(counts(builderBody(250))).toEqual([1, 1, 2]);
  expect(counts(builderBody(499))).toEqual([1, 1, 2]);
  expect(counts(builderBody(500))).toEqual([2, 2, 4]);
  expect(counts(builderBody(750))).toEqual([3, 3, 6]);
  expect(counts(builderBody(1000))).toEqual([5, 5, 5]);
  expect(counts(builderBody(2100))).toEqual([10, 10, 10]);
  expect(builderBody(10000)).toEqual(builderBody(2100));
});
test('upgrader scaling preserves middle tiers, RCL8 cap and maximum body', () => {
  expect(counts(upgraderBody(1500, 7))).toEqual([9, 3, 6]);
  expect(upgraderBody(1500, 7)?.cost).toBe(1350);
  expect(counts(upgraderBody(1600, 7))).toEqual([11, 3, 7]);
  expect(counts(upgraderBody(2100, 7))).toEqual([15, 3, 9]);
  expect(counts(upgraderBody(3850, 7))).toEqual([29, 3, 16]);
  expect(counts(upgraderBody(10000, 8))).toEqual([15, 3, 9]);
  expect(upgraderBody(10000, 7)).toEqual(upgraderBody(3850, 7));
});
test('specialist recipes require their actual budget and do not imply boost or remote admission', () => {
  expect(builderBody(3499, true)).toBeUndefined();
  expect(counts(builderBody(3500, true))).toEqual([20, 20, 10]);
  expect(upgraderBody(4599, 8, true)).toBeUndefined();
  expect(counts(upgraderBody(4600, 8, true))).toEqual([42, 3, 5]);
  expect(upgraderBody(4600, 8, true)?.parts[0]).toBe('move');
});
test('every admitted body fits budget and part limits across the supported economy range', () => {
  for (let budget = 0; budget <= 6000; budget++) {
    for (const plan of [builderBody(budget), builderBody(budget, true), upgraderBody(budget, 7), upgraderBody(budget, 8), upgraderBody(budget, 8, true)]) {
      if (!plan) continue;
      expect(plan.cost).toBeLessThanOrEqual(budget);
      expect(plan.parts.length).toBeLessThanOrEqual(50);
      expect(plan.spawnTicks).toBe(plan.parts.length * 3);
    }
  }
  for (const budget of [-1, 0.5, NaN, Infinity]) {
    expect(() => builderBody(budget)).toThrow();
    expect(() => upgraderBody(budget, 8)).toThrow();
  }
  expect(() => upgraderBody(300, 0)).toThrow();
});
