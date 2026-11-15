import type { RuntimeConfig } from '../../config/model';
import type { AssessmentInput } from '../../capabilities/planning/assessment-model';
import type { PlanState } from './plan-model';
import { preparePlanningRequest } from './planning-request';
/** Work budgets do not change the desired plan; an explicit refresh revision does. */
export function prepareConfiguredPlanningRequest(
  observation: AssessmentInput, plan: PlanState, config: Readonly<RuntimeConfig>, valuableTypes: readonly string[],
) {
  return preparePlanningRequest(observation, plan, {
    strategy: config.layoutStrategy, preserveExisting: config.planningPreserveExisting,
    constrainedAnchorLimit: config.planningAnchorLimit, refreshRevision: config.planningRefreshRevision, valuableTypes,
  });
}
