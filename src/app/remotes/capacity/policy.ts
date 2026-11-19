import type { RemoteConfig } from '../../../config/remotes';
import type { RemoteCapacityPolicy } from '../../../features/remotes/capacity/model';
export function remoteCapacityPolicy(config: RemoteConfig): RemoteCapacityPolicy {
  return { initial: config.remoteAdaptiveInitialSources,maximum: config.remoteAdaptiveMaximumSources,
    interval: config.remoteAdaptiveInterval,increaseAt: config.remoteAdaptiveIncreaseAt,decreaseAt: config.remoteAdaptiveDecreaseAt };
}
export function activeHomeSpawns(home: string): StructureSpawn[] {
  return Object.values(Game.spawns).filter(spawn => spawn.my && spawn.room.name === home && spawn.isActive());
}
