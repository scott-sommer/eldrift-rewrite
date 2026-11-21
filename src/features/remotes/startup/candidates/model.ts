import type { assessStartupProject, StartupReturnPolicy } from '../../../../capabilities/economy/startup/assessment';
import type { StartupPlanningContext, StartupPlanningQuery } from '../planning/model';
export interface StartupCandidateEntry extends StartupPlanningContext {
  id: string; recordedAt: number; inputIdentity: string; policyIdentity: string;
  assessment: ReturnType<typeof assessStartupProject>;
}
export interface StartupCandidateRecord { home: string; revision: number; clock: number; entries: StartupCandidateEntry[] }
export interface StartupCandidateQuery { id: string; query: StartupPlanningQuery }
export type StartupCandidateWrite = 'saved' | 'conflict' | 'capacity' | 'unavailable';
export function startupPolicyIdentity(policy: StartupReturnPolicy): string {
  return JSON.stringify([policy.minimumRecoveryMargin,policy.minimumDeliveredEnergy,policy.maximumRecoveryTicks,policy.maximumHouseholdCapital]);
}
