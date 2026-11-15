import { planningScoreDefaults, planningScoreValidators } from './planning-score';
import type { PlanningScoreConfig } from './planning-score';
export interface PlanningConfig extends PlanningScoreConfig {
  planningEnabled: boolean;
  planningCpuBudget: number;
  planningCandidateAttempts: number;
  planningEvaluationSteps: number;
  planningSearches: number;
  planningPreserveExisting: boolean;
  planningAnchorLimit: number;
  planningRefreshRevision: number;
}
export const planningDefaults: Readonly<PlanningConfig> = Object.freeze({
  ...planningScoreDefaults,
  planningEnabled: false, planningCpuBudget: 5, planningCandidateAttempts: 100,
  planningEvaluationSteps: 1, planningSearches: 1, planningPreserveExisting: true,
  planningAnchorLimit: 36, planningRefreshRevision: 0,
});
function integer(value: unknown, maximum: number, minimum = 0): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
export const planningValidators: { [K in keyof PlanningConfig]: (value: unknown) => boolean } = {
  ...planningScoreValidators,
  planningEnabled: value => typeof value === 'boolean',
  planningCpuBudget: value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000,
  planningCandidateAttempts: value => integer(value, 10000),
  planningEvaluationSteps: value => integer(value, 10000),
  planningSearches: value => integer(value, 10000),
  planningPreserveExisting: value => typeof value === 'boolean',
  planningAnchorLimit: value => integer(value, 2500, 1),
  planningRefreshRevision: value => integer(value, Number.MAX_SAFE_INTEGER),
};
