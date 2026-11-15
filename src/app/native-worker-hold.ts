import type { RuntimeConfig } from '../config/model';
/** Transfer markers suppress only the upgrader-v2 distant-storage fallback. */
export function nativeWorkerHold(room: Room, config: Readonly<RuntimeConfig>): boolean {
  if (config.workerHoldStoragePosition) return true;
  return config.workerEnergyProfile === 'upgrader-v2'
    && room.find(FIND_FLAGS).some(flag => flag.name.includes('Transfer'));
}
