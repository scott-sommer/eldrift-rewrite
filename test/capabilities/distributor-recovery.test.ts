import { expect, test } from 'vitest';
import { distributorTarget } from '../../src/features/recovery/distributor-policy';
import { recoverDistributor } from '../../src/features/recovery/distributor-ownership';
import { distributorOwner, haulingOwner, scavengerOwner, isHaulingOwner } from '../../src/features/logistics/identity';
import { distributor } from '../../src/capabilities/spawning/economy-recipes';
test('recovery suppresses distributor demand through equality and restores at least one above it', () => {
  expect(distributorTarget(2, true, 12499, 12500)).toBe(0);
  expect(distributorTarget(2, true, 12500, 12500)).toBe(0);
  expect(distributorTarget(2, true, 12501, 12500)).toBe(2);
  expect(distributorTarget(0, true, 12501, 12500)).toBe(1);
  expect(distributorTarget(0, false, 12501, 12500)).toBe(0);
  expect(distributorTarget(2, false, 0, 12500)).toBe(2);
  expect(() => distributorTarget(1, true, -1, 12500)).toThrow();
});
test('recovery ownership conversion is room scoped and leaves other owners unchanged', () => {
  const identity = { owner: distributorOwner('W0N1'), home: 'W0N1' };
  expect(recoverDistributor(identity, 'W0N1')).toEqual({ owner: haulingOwner('W0N1'), home: 'W0N1' });
  expect(recoverDistributor(identity, 'E0N1')).toBe(identity);
  for (const owner of [scavengerOwner('W0N1'), haulingOwner('W0N1'), 'upgrade-master:W0N1']) {
    const other = { owner, home: 'W0N1' };
    expect(recoverDistributor(other, 'W0N1')).toBe(other);
  }
  expect(isHaulingOwner(identity.owner, identity.home)).toBe(true);
  expect(isHaulingOwner(identity.owner, 'E0N1')).toBe(false);
});
test('distributor recipe preserves ratio and level cap without creating unaffordable bodies', () => {
  expect(distributor(149, 5)).toBeUndefined();
  expect(distributor(150, 5)!.parts).toEqual(['carry', 'carry', 'move']);
  expect(distributor(3000, 6)!.cost).toBe(1050);
  expect(distributor(3000, 7)!.cost).toBe(2100);
  for (let budget = 0; budget <= 3000; budget += 25) {
    const plan = distributor(budget, 6);
    if (plan) {
      expect(plan.cost).toBeLessThanOrEqual(budget);
      expect(plan.parts.filter(part => part === 'carry').length).toBe(2 * plan.parts.filter(part => part === 'move').length);
    }
  }
});
