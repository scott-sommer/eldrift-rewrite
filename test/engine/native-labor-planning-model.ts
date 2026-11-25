import type { StartupPlanningInput } from '../../src/features/remotes/startup/planning/model';
import type { assessStartupProject } from '../../src/capabilities/economy/startup/assessment';
export interface LaborCandidatePlanningProof {
  root: { eldrift?: unknown }; input: StartupPlanningInput; binding: string; savedAt: number;
  resumedAt?: number; through?: number; endingEnergy?: number; readOnlyOperational?: boolean;
  assessment?: ReturnType<typeof assessStartupProject>;
}
