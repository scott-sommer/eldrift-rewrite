import { expect, test } from 'vitest';
import { shouldRepairMining } from '../../src/capabilities/mining/repair-policy';
test('harvesting repairs require critical damage and energy above the legacy reserve', () => {
  expect(shouldRepairMining(19, 100, 21, false)).toBe(true);
  expect(shouldRepairMining(20, 100, 21, false)).toBe(false);
  expect(shouldRepairMining(19, 100, 20, false)).toBe(false);
  expect(shouldRepairMining(80, 100, 50, false)).toBe(false);
});
test('source downtime admits noncritical repairs without spending nonexistent energy', () => {
  expect(shouldRepairMining(99, 100, 1, true)).toBe(true);
  expect(shouldRepairMining(99, 100, 0, true)).toBe(false);
  expect(shouldRepairMining(100, 100, 50, true)).toBe(false);
});
test('callers can override maintenance policy without changing execution', () => {
  expect(shouldRepairMining(30, 100, 11, false, { criticalFraction: 0.4, energyReserve: 10 })).toBe(true);
  expect(() => shouldRepairMining(30, 100, 11, false, { criticalFraction: 2, energyReserve: 10 })).toThrow();
});
