import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { observeRecoveryRoom, observeRecoveryDonors } from '../adapters/screeps/recovery-assessment';
import { refreshRecovery } from '../features/recovery/store';
import { defaultRecoveryPolicy } from '../features/recovery/policy';
export function createNativeRecovery(state: StatePort) {
  return (room: Room, config: Readonly<RuntimeConfig>) => refreshRecovery(state, observeRecoveryRoom(room),
    () => observeRecoveryDonors(room), { ...defaultRecoveryPolicy, interval: config.recoveryInterval,
      enterEnergy: config.recoveryEnterEnergy, exitEnergy: config.recoveryExitEnergy,
      donorMinimumEnergy: config.recoveryDonorMinimumEnergy, donorMaximumDistance: config.recoveryDonorMaximumDistance,
      supportBatch: config.recoverySupportBatch }, config.recoveryEnabled, Game.time);
}
