import { createStampPreparationCache } from '../capabilities/planning/stamp-preparation-cache';
import { createInfrastructureCache } from '../capabilities/planning/infrastructure-cache';
import { createStampReplayCache } from '../capabilities/planning/stamp-replay-cache';
import { createAssessmentCache } from '../capabilities/planning/assessment-cache';
export interface PlanningRoomCache { prepare: ReturnType<typeof createStampPreparationCache>; attach: ReturnType<typeof createInfrastructureCache>; replay: ReturnType<typeof createStampReplayCache>; assess: ReturnType<typeof createAssessmentCache> }
/** Bounded room-owned heap accelerators; eviction changes performance, never persisted correctness. */
export function createPlanningRoomCaches(limit = 32) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid planning cache limit');
  const rooms = new Map<string, PlanningRoomCache>();
  return (room: string): PlanningRoomCache => {
    const cache = rooms.get(room) ?? { prepare: createStampPreparationCache(), attach: createInfrastructureCache(), replay: createStampReplayCache(), assess: createAssessmentCache() };
    rooms.delete(room);
    rooms.set(room, cache);
    if (rooms.size > limit) rooms.delete(rooms.keys().next().value!);
    return cache;
  };
}
