import { generateNativeRecoveryBanking } from './native-recovery-banking';
import { generateNativeWorkSupply } from './native-work-supply';
import { generateNativeEnergyBanking } from './native-energy-banking';
import { generateNativeMineralTransport } from './native-mineral-transport';
import { generateNativeEnergyRequests } from './native-energy-supply';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
/** Generate urgent consumer commitments before lower-priority durable-stock transport. */
export function generateNativeLogisticsRequests(state: StatePort, room: Room, units: readonly Creep[], config: Readonly<RuntimeConfig>, recoveryActive = false): void {
  if (config.energyRequestsEnabled || config.preservationEnabled) generateNativeEnergyRequests(state, room, units, config);
  generateNativeWorkSupply(state, room, units, config);
  generateNativeRecoveryBanking(state, room, config, recoveryActive);
  if (config.mineralTransportEnabled) generateNativeMineralTransport(state, room, config);
  if (config.energyBankingEnabled) generateNativeEnergyBanking(state, room, config);
}
