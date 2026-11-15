import type { RuntimeConfig } from '../config/model';
import { defaultWorkPolicy } from '../features/work/policy';
import { fortificationCeiling } from '../features/work/legacy-fortification';
import { upgradeBootstrapOwner } from '../features/work/upgrade-identity';
export function nativeWorkerWorkPolicy(creep: Creep, room: Room, settings: Readonly<RuntimeConfig>, recoveryActive: boolean) {
  const bootstrap = creep.memory.population?.owner === upgradeBootstrapOwner(room.name);
  const legacy = settings.workerFortificationProfile === 'legacy' ? {
    legacyFortificationCeiling: fortificationCeiling(room.controller!.level,
      RAMPART_HITS_MAX[room.controller!.level] ?? 0, settings.workerFortificationCeiling),
  } : {};
  return { ...defaultWorkPolicy, ...legacy, wallHits: settings.workerWallHits, rampartHits: settings.workerRampartHits,
    downgradeThreshold: settings.workerDowngradeThreshold,
    allowUpgrade: bootstrap || !recoveryActive && (!room.storage || room.storage.store.energy > settings.workerUpgradeReserve) };
}
export function retainedWorkerTarget(creep: Creep, settings: Readonly<RuntimeConfig>, current?: string): string | undefined {
  return settings.workerMode === 'fortifier' && settings.workerFortificationProfile === 'legacy' && creep.store.energy === 0 ? undefined : current;
}
