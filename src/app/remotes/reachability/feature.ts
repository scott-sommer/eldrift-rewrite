import type { StatePort } from '../../../persistence/versioned-state';
import type { RoomFeature } from '../../runtime-model';
import type { createNativeDispatch } from '../../native-dispatch';
import { createRemoteReachabilityStore } from '../../../features/remotes/reachability/store';
import { snapshotRemoteReachability } from './snapshot';
import { enforceUnreachableRooms } from './enforce';
/** Mandatory lifecycle observation precedes optional actor work; absence never implies end-of-life failure. */
export function createNativeRemoteReachabilityFeature(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>): RoomFeature {
  return { id: 'remote-reachability',scope: 'owned',urgency: 'urgent',interval: 1,run(context) {
    const config = context.config.values;
    if (!config.remoteManagementEnabled) return;
    const home = context.room.name, store = createRemoteReachabilityStore(state,home), current = store.read();
    enforceUnreachableRooms(state,dispatch,home,new Set(current.blocked.map(item => item.room)));
    const units = snapshotRemoteReachability(state,home,config);
    if (units.length || current.attempts.length) {
      if (!store.observe(current.revision,Game.time,units)) return;
    }
    const next = store.read();
    if (next.blocked.length > current.blocked.length) enforceUnreachableRooms(state,dispatch,home,new Set(next.blocked.map(item => item.room)));
  } };
}
