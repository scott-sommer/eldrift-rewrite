import { createStampReplayCache } from '../capabilities/planning/stamp-replay-cache';
import type { StampReplayCache } from '../capabilities/planning/stamp-replay-cache';
/** Bounded room-owned heap accelerators; eviction changes performance, never persisted correctness. */
export function createPlanningRoomCaches(limit = 32) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid planning cache limit');
  const rooms = new Map<string, StampReplayCache>();
  return (room: string): StampReplayCache => {
    const cache = rooms.get(room) ?? createStampReplayCache();
    rooms.delete(room);
    rooms.set(room, cache);
    if (rooms.size > limit) rooms.delete(rooms.keys().next().value!);
    return cache;
  };
}
