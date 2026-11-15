import type { StatePort } from '../persistence/versioned-state';
import { openState } from '../persistence/versioned-state';
import { planSchema } from '../features/planning/plan-state';
import { blockedPlanPlacements, placementKey } from '../features/planning/dependencies';
import { observeWorkAssessment } from '../adapters/screeps/work-assessment';
/** Planning owns dependencies; native observation supplies actual completed structures. */
export function assessNativeWork(state: StatePort, room: Room) {
  const assessment = observeWorkAssessment(room);
  const key = 'planning/' + room.name;
  if (state.read(key) === undefined) return assessment;
  const plan = openState(state, key, planSchema(room.name, Object.keys(CONTROLLER_STRUCTURES)));
  const completed = new Set(room.find(FIND_STRUCTURES).filter(item => !('my' in item) || item.my)
    .map(item => placementKey({ type: item.structureType, x: item.pos.x, y: item.pos.y })));
  const blocked = blockedPlanPlacements(plan.entries, completed, room.controller?.level ?? 0);
  return { ...assessment, sites: assessment.sites.map(site => ({ ...site,
    ready: site.ready && !blocked.has(placementKey({ type: site.type, x: site.position.x, y: site.position.y })) })) };
}
