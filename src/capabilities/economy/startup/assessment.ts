import { laborFulfilled } from './household/labor/fulfillment';
import type { HouseholdLaborJob, HouseholdLaborState } from './household/labor/model';
import type { forecastStartupProject } from './project';
export interface StartupReturnPolicy {
  minimumRecoveryMargin: number; minimumDeliveredEnergy: number;
  maximumRecoveryTicks: number; maximumHouseholdCapital: number;
}
export type StartupRejection = 'household-funding' | 'capital-budget' | 'construction'
  | 'service-birth' | 'labor-work' | 'delivery' | 'recovery-deadline' | 'final-return';
type ProjectResult = ReturnType<typeof forecastStartupProject>;
/** Forecast policy only: acceptance grants no birth, lease or capital ownership. */
export function assessStartupProject(result: ProjectResult, horizon: number, policy: StartupReturnPolicy, requiredBirths: readonly string[], requiredLabor: readonly HouseholdLaborJob[] = []) {
  validatePolicy(policy,horizon);
  const rejected: StartupRejection[] = [];
  if (result.delivery.projectedThrough !== horizon+1) throw new Error('Incomplete startup assessment horizon');
  if (result.cash.homeShortfall > 0) rejected.push('household-funding');
  if (result.cash.requiredHomeEnergy > policy.maximumHouseholdCapital) rejected.push('capital-budget');
  if (result.construction.completeAt === null) rejected.push('construction');
  rejected.push(...serviceRejections(result,requiredBirths,requiredLabor));
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

function serviceRejections(result: ProjectResult, requiredBirths: readonly string[], requiredLabor: readonly HouseholdLaborJob[]): StartupRejection[] {
  const rejected: StartupRejection[] = [];
  if (requiredBirths.some(id => !result.spawning.births.some(birth => birth.request === id))) rejected.push('service-birth');
  if (!laborFulfilled(result.spawning as { labor?: { jobs: HouseholdLaborState[] } },requiredLabor)) rejected.push('labor-work');
  return rejected;
}
