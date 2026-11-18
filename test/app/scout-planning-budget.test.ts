import { expect, test } from 'vitest';
import { createScoutPlanningBudget } from '../../src/app/scout-planning-budget';
import { defaults } from '../../src/config/model';

test('recruitment and fallback requests cannot restart the home CPU allowance', () => {
  let tick = 1, used = 0;
  const budget = createScoutPlanningBudget({ tick: () => tick, usedCpu: () => used, tickLimit: () => 100, bucket: () => 10000 });
  expect(budget('W0N1',defaults)()).toBe(true);
  used = 3;
  expect(budget('W0N1',defaults)()).toBe(false);
  expect(budget('W1N1',defaults)()).toBe(true);
  tick = 2;
  expect(budget('W0N1',defaults)()).toBe(true);
});

test('background fraction, bucket and explicit pause still gate shared discovery', () => {
  let used = 49, bucket = 10000;
  const budget = createScoutPlanningBudget({ tick: () => 1, usedCpu: () => used, tickLimit: () => 100, bucket: () => bucket });
  const guard = budget('W0N1',defaults);
  expect(guard()).toBe(true);
  used = 50;
  expect(guard()).toBe(false);
  used = 0; bucket = 0;
  expect(guard()).toBe(false);
  bucket = 10000;
  expect(budget('W1N1',{ ...defaults, scoutPlanCpuBudget: 0 })()).toBe(false);
  expect(budget('W2N1',{ ...defaults, backgroundEnabled: false })()).toBe(false);
});
