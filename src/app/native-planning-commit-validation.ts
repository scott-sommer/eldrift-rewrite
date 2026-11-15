import { createPlanningCommitValidator } from '../features/planning/planning-commit-validation';
import { prepareConfiguredPlanningRequest } from '../features/planning/configured-planning-request';
import { identifyPlanningRequest } from '../features/planning/planning-identity';
import { observeRoomPlanningInput } from '../adapters/screeps/room-assessment';
import { nativePlanningLimits } from '../adapters/screeps/planning-limits';
import type { PlanState } from '../features/planning/plan-model';
import type { RuntimeConfig } from '../config/model';
import type { PlanningConstraint } from '../capabilities/planning/assessment-model';
import type { BarrierCostInput } from '../capabilities/planning/barrier-cost';
export interface NativeCommitPolicy {
  config: Readonly<RuntimeConfig>; currentPlan: PlanState; valuableTypes: readonly string[];
  implementationRevision: string; constraints: readonly PlanningConstraint[];
  protectedTypes: readonly string[]; barrierCosts: BarrierCostInput['costs'];
}
/** Native room, configuration and manual policy are read again at the actual commit call. */
export function createNativePlanningCommitValidator(room: string, readPolicy: () => NativeCommitPolicy) {
  return createPlanningCommitValidator(() => {
    if (!Game.rooms[room]?.controller?.my) return undefined;
    const policy = readPolicy();
    if (!policy.config.planningEnabled) return undefined;
    const observation = observeRoomPlanningInput(room, { constraints: policy.constraints });
    if (!observation) return undefined;
    const request = prepareConfiguredPlanningRequest(observation, policy.currentPlan, policy.config, policy.valuableTypes);
    if (!request.ok) return undefined;
    return { room, observation: request.observation, ...identifyPlanningRequest(request, policy.implementationRevision, room),
      limits: nativePlanningLimits(), blocksMovement: (type: string) => (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(type),
      protectedTypes: policy.protectedTypes, barrierCosts: policy.barrierCosts };
  });
}
