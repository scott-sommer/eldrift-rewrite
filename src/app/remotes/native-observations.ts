import type { StatePort } from '../../persistence/versioned-state';
import { createIntelStore } from '../../features/intel/store';
import { observeNativeIntel } from '../native-intel-observation';
/** Refresh only visible requested rooms, once per tick, before operational admission. */
export function createRemoteObservationRefresh(state: StatePort) {
  const intel = createIntelStore(state), refreshed = new Set<string>();
  let tick = -1;
  return (rooms: readonly string[]): void => {
    if (tick !== Game.time) { tick = Game.time; refreshed.clear(); }
    for (const room of rooms) {
      if (refreshed.has(room) || !Game.rooms[room]) continue;
      refreshed.add(room);
      if (intel.peek(room,tick).record.summary?.observedAt === tick) continue;
      const summary = observeNativeIntel(room);
      if (summary) intel.observeSummary(summary);
    }
  };
}
