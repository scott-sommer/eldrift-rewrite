import { planSchema } from './plan-state';
import type { PlanState } from './plan-model';
import { assessRoom } from '../../capabilities/planning/assessment';
import type { AssessmentInput } from '../../capabilities/planning/assessment-model';
import { validateDraft } from '../../capabilities/planning/draft-validation';
import { placementFailures } from '../../capabilities/planning/placement-validation';
import { barrierCost } from '../../capabilities/planning/barrier-cost';
import type { BarrierCostInput } from '../../capabilities/planning/barrier-cost';
import type { StructureLimits } from '../../capabilities/planning/core-model';
export interface PlanningValidationSnapshot {
  room: string; observation: AssessmentInput; observationIdentity: string; policyIdentity: string;
  limits: StructureLimits; blocksMovement: (type: string) => boolean;
  protectedTypes: readonly string[]; barrierCosts: BarrierCostInput['costs'];
}
/** Read afresh for every call; cached candidate preparation is never authoritative at commit. */
export function createPlanningCommitValidator(read: () => PlanningValidationSnapshot | undefined) {
  return (plan: PlanState): boolean => {
    const current = read();
    if (!current || plan.room !== current.room) return false;
    if (plan.provenance?.observation !== current.observationIdentity || plan.provenance.policy !== current.policyIdentity) return false;
    if (!planSchema(current.room, Object.keys(current.limits)).valid(plan)) return false;
    const entries = plan.entries.map(({ x, y, ...metadata }) => ({ ...metadata, position: { x, y } }));
    const validation = validateDraft({
      assessment: assessRoom(current.observation), entries, limits: current.limits,
      constraints: current.observation.constraints, blocksMovement: current.blocksMovement,
      placementFailures: placements => placementFailures(placements, current.observation),
    });
    if (!validation.ok) return false;
    return barrierCost({ observation: current.observation, costs: current.barrierCosts,
      barriers: entries.filter(entry => ['rampart', 'constructedWall'].includes(entry.type)),
      protectedAssets: entries.filter(entry => current.protectedTypes.includes(entry.type)),
    }).ok;
  };
}
