import type { RuntimeConfig } from '../../../config/model';
import type { BodyPart } from '../../../capabilities/spawning/body';
import { bodyCost } from '../../../capabilities/spawning/body';
import type { RemoteFleetIdentity } from '../../../features/remotes/fleet/model';
export function remoteFleetWorkEnabled(config: Readonly<RuntimeConfig>): boolean {
  return config.remoteManagementEnabled && config.remoteWorkersEnabled && config.remoteMaximumSlots > 0 && config.remoteWorkerMaximumUnits > 0;
}
export function remoteFleetSpawningEnabled(config: Readonly<RuntimeConfig>): boolean {
  return remoteFleetWorkEnabled(config) && config.remoteSpawningEnabled;
}
export function remoteFleetBodyAllowed(body: readonly BodyPart[], kind: RemoteFleetIdentity['kind'], room: Room, config: Readonly<RuntimeConfig>): boolean {
  if (!room.controller?.my || room.controller.level < config.remoteMinimumRcl) return false;
  const budget = kind === 'miner' ? config.remoteMinerBodyBudget : config.remoteCourierBodyBudget;
  return bodyCost(body) <= Math.min(room.energyCapacityAvailable,budget);
}
