import { createPlanningFeature } from './planning-feature';
import type { PlanningFeaturePorts } from './planning-feature';
/** Operational budgets follow normal configuration layers; request policy remains preparation-owned. */
export function createConfiguredPlanningFeature(ports: Omit<PlanningFeaturePorts, 'enabled' | 'budget'>) {
  return createPlanningFeature({ ...ports,
    enabled: context => context.config.values.planningEnabled,
    budget: context => ({ cpu: context.config.values.planningCpuBudget,
      attempts: context.config.values.planningCandidateAttempts, steps: context.config.values.planningEvaluationSteps }),
  });
}
