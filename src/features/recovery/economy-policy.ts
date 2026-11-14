import type { RuntimeConfig } from '../../config/model';
/** Operational overrides are derived policy, not writes to operator configuration. */
export function recoveryEconomy(config: Readonly<RuntimeConfig>, active: boolean): Readonly<RuntimeConfig> {
  if (!active || !config.recoveryEconomyEnabled) return config;
  return { ...config, miningEnabled: true, mineralMiningEnabled: false, mineralTransportEnabled: false,
    logisticsEnabled: true, energyRequestsEnabled: true, energyReclamationEnabled: true,
    energyBankingEnabled: true, storeBalancingEnabled: false, courierSpawningEnabled: true,
    miningBodyBudget: Math.min(config.miningBodyBudget, config.recoveryMiningBodyBudget),
    courierBodyBudget: Math.min(config.courierBodyBudget, config.recoveryCourierBodyBudget) };
}
