import type { RuntimeConfig } from '../../../../config/model';
export function startupEconomicPolicy(config: Readonly<RuntimeConfig>) {
  return { minimumRecoveryMargin: config.remoteStartupMinimumMargin,minimumDeliveredEnergy: 1,
    maximumRecoveryTicks: config.remoteStartupHorizon,maximumHouseholdCapital: config.remoteStartupMaximumCapital };
}
