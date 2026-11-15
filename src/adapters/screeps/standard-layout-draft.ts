import { standardDraft } from '../../capabilities/planning/standard-draft';
import type { CoreCandidate } from '../../capabilities/planning/standard-candidates';
import type { AssessmentInput } from '../../capabilities/planning/assessment-model';
import { observeRoomPlanningInput } from './room-assessment';
import { planningRoadSearch } from './planning-road-search';
/** Read-only evaluation: never writes Memory or creates construction sites. */
export function observeStandardLayoutDraft(
  room: string, candidate: CoreCandidate, constraints: AssessmentInput['constraints'] = [], maxOps = 2000,
) {
  const observation = observeRoomPlanningInput(room, { constraints });
  if (!observation) return { ok: false as const, phase: 'visibility' as const, details: room };
  const limits = Object.fromEntries(Object.entries(CONTROLLER_STRUCTURES).map(([type, levels]) =>
    [type, Array.from({ length: 9 }, (_, level) => levels[level as keyof typeof levels] ?? 0)]));
  return standardDraft({
    candidate, observation, limits,
    blocksMovement: type => (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(type),
    search: costs => planningRoadSearch(room, costs, maxOps),
  });
}
