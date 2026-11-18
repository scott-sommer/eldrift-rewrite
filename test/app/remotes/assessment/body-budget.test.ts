import { expect, test } from 'vitest';
import { remoteBodiesWithinBudget } from '../../../../src/app/remotes/assessment/body-budget';
import type { RemoteEconomicPolicy } from '../../../../src/features/remotes/assessment-model';
test('buildability uses configured bodies against maximum home energy capacity without mutating them', () => {
  const bodies: Pick<RemoteEconomicPolicy,'miner' | 'hauler'> = {
    miner: { body: ['work','work','move'],lifetime: 1500 },
    hauler: { body: ['carry','move'],lifetime: 1500,serviceTicks: 2 } };
  const before = structuredClone(bodies);
  expect(remoteBodiesWithinBudget(bodies,250)).toBe(true);
  expect(remoteBodiesWithinBudget(bodies,249)).toBe(false);
  expect(remoteBodiesWithinBudget(bodies,0)).toBe(false);
  expect(() => remoteBodiesWithinBudget(bodies,NaN)).toThrow('capacity');
  expect(bodies).toEqual(before);
});
