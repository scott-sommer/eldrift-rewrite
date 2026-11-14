import type { RuntimeConfig } from '../config/model';
import { upgradeBootstrapOwner } from '../features/work/upgrade-identity';
import { workModeFor } from '../features/work/identity';
export function nativeWorkerSettings(owner: string, home: string, config: Readonly<RuntimeConfig>): Readonly<RuntimeConfig> | undefined {
  if (owner === upgradeBootstrapOwner(home)) return { ...config, workersEnabled: config.upgradeRoomEnabled,
    workerMode: 'builder', workerEnergyProfile: 'balanced', workerEnergyStorageReserve: 0, workerUpgradeReserve: 0 };
  const mode = workModeFor(owner, home, config.workerMode);
  return mode ? { ...config, workerMode: mode } : undefined;
}
