import type { forecastStartupProject } from './project';
export interface StartupReturnPolicy {
  minimumRecoveryMargin: number; minimumDeliveredEnergy: number;
  maximumRecoveryTicks: number; maximumHouseholdCapital: number;
}
export type StartupRejection = 'household-funding' | 'capital-budget' | 'construction'
  | 'service-birth' | 'delivery' | 'recovery-deadline' | 'final-return';
type ProjectResult = ReturnType<typeof forecastStartupProject>;
/** Forecast policy only: acceptance grants no birth, lease or capital ownership. */
export function assessStartupProject(result: ProjectResult, horizon: number, policy: StartupReturnPolicy, requiredBirths: readonly string[]) {
  validatePolicy(policy,horizon);
  const rejected: StartupRejection[] = [];
  if (result.delivery.projectedThrough !== horizon+1) throw new Error('Incomplete startup assessment horizon');
  if (result.cash.homeShortfall > 0) rejected.push('household-funding');
  if (result.cash.requiredHomeEnergy > policy.maximumHouseholdCapital) rejected.push('capital-budget');
  if (result.construction.completeAt === null) rejected.push('construction');
  if (requiredBirths.some(id => !result.spawning.births.some(birth => birth.request === id))) rejected.push('service-birth');
  if (result.projectCash.deliveredEnergy < policy.minimumDeliveredEnergy) rejected.push('delivery');
  const recoveryAt = result.projectCash.firstRecoveryAt;
  if (recoveryAt === null || recoveryAt > policy.maximumRecoveryTicks) rejected.push('recovery-deadline');
  if (result.projectCash.constructionRecoveryMargin < policy.minimumRecoveryMargin) rejected.push('final-return');
  return { accepted: rejected.length === 0,rejected,horizon,
    requiredHouseholdCapital: result.cash.requiredHomeEnergy,householdShortfall: result.cash.homeShortfall,
    deliveredEnergy: result.projectCash.deliveredEnergy,recoveryAt,
    recoveryMargin: result.projectCash.constructionRecoveryMargin };
}
export function validateStartupReturnPolicy(policy: StartupReturnPolicy): void {
  if (!Object.values(policy).every(value => Number.isSafeInteger(value) && value >= 0)
    || !['minimumRecoveryMargin','minimumDeliveredEnergy','maximumRecoveryTicks','maximumHouseholdCapital'].every(key => key in policy)
    || policy.maximumRecoveryTicks > 10000) throw new Error('Invalid startup return policy');
}
function validatePolicy(policy: StartupReturnPolicy, horizon: number): void {
  validateStartupReturnPolicy(policy);
  if (!Number.isSafeInteger(horizon) || horizon < 0 || horizon > 10000 || policy.maximumRecoveryTicks > horizon) throw new Error('Invalid startup assessment horizon');
}
