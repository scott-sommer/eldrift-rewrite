import { createRemoteCapacityStore } from '../../../features/remotes/capacity/store';
import { nextRemoteCapacity, supportedRemoteSources } from '../../../features/remotes/capacity/policy';
import { createSpawnLoadStore } from '../../../features/population/spawn-load/store';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RoomFeature } from '../../runtime-model';
import type { RemoteConfig } from '../../../config/remotes';
import type { RemoteManagementPolicy } from '../../../features/remotes/management/model';
import { activeHomeSpawns, remoteCapacityPolicy } from './policy';
/** Observation policy is urgent and independent of optional discovery/actor CPU budgets. */
export function createNativeRemoteCapacityFeature(state: StatePort): RoomFeature {
  return { id: 'remote-capacity',scope: 'owned',urgency: 'urgent',interval: 1,run(context) {
    if (!context.config.values.remoteAdaptiveEnabled) return;
    const home = Game.rooms[context.room.name];
    if (!home?.controller?.my) return;
    const config = context.config.values, store = createRemoteCapacityStore(state,home.name), current = store.read();
    const load = createSpawnLoadStore(state,home.name).report(Math.max(0,Game.time-1),activeHomeSpawns(home.name).length);
    const next = nextRemoteCapacity(current,Game.time,home.controller.level,load,remoteCapacityPolicy(config));
    if (next) store.save(current.revision,next);
  } };
}
export function limitRemoteSources(state: StatePort, home: Room, policy: RemoteManagementPolicy, config: RemoteConfig): RemoteManagementPolicy {
  if (!config.remoteAdaptiveEnabled) return policy;
  const record = createRemoteCapacityStore(state,home.name).read();
  const maximumSources = supportedRemoteSources(record,home.controller?.level ?? 0,config.remoteAdaptiveMaximumSources);
  return { ...policy,portfolio: { ...policy.portfolio,maximumSources } };
}
