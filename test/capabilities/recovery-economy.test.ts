import { expect, test } from 'vitest';
import { recoveryEconomy } from '../../src/features/recovery/economy-policy';
import { defaults } from '../../src/config/model';
test('active recovery derives a bootstrap energy economy without mutating operator settings', () => {
  const config = { ...defaults, mineralMiningEnabled: true, mineralTransportEnabled: true, storeBalancingEnabled: true };
  const policy = recoveryEconomy(config, true);
  expect(policy).toMatchObject({ miningEnabled: true, miningBodyBudget: 200, logisticsEnabled: true,
    courierSpawningEnabled: true, courierBodyBudget: 100, energyRequestsEnabled: true, energyBankingEnabled: true,
    preservationEnabled: true, preservationEnergyOnly: true, energyReclamationEnabled: true, mineralMiningEnabled: false, mineralTransportEnabled: false, storeBalancingEnabled: false });
  expect(config.miningEnabled).toBe(false);
  expect(config.mineralMiningEnabled).toBe(true);
  expect(recoveryEconomy(config, false)).toBe(config);
  const assessmentOnly = { ...config, recoveryEconomyEnabled: false };
  expect(recoveryEconomy(assessmentOnly, true)).toBe(assessmentOnly);
});
test('emergency body budgets never exceed the ordinary configured cap', () => {
  const policy = recoveryEconomy({ ...defaults, miningBodyBudget: 300, courierBodyBudget: 150,
    recoveryMiningBodyBudget: 800, recoveryCourierBodyBudget: 300 }, true);
  expect(policy.miningBodyBudget).toBe(300);
  expect(policy.courierBodyBudget).toBe(150);
});
