import type { RuntimeConfig } from '../config/model';
/** Ordinary legacy upgraders tighten position; other work profiles retain the API action range. */
export function nativeWorkerUpgradeRange(settings: Readonly<RuntimeConfig>): number {
  return settings.workerMode === 'upgrader' && settings.workerEnergyProfile === 'upgrader'
    ? settings.workerUpgradeApproachRange : 3;
}
