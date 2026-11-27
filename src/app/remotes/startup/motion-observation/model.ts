import type { StartupPaidCohort,StartupPaidWorker } from '../../../../capabilities/economy/startup/shared-model';
import type { StartupTravelPlan } from '../../../../features/remotes/startup/travel-model';
import type { Position } from '../../../../capabilities/movement/step';
import type { LogisticsRequest } from '../../../../capabilities/logistics/request';
import type { Journal } from '../../../../features/logistics/transfer-journal';
export interface PaidCourierContext {
  cohort: Pick<StartupPaidCohort,'home' | 'room' | 'source' | 'generation' | 'endpoint'>;
  paid: StartupPaidWorker; plan: StartupTravelPlan;
}
export interface PaidCourierObservation {
  observedAt: number; name: string; unit: string; owner: string; position: Position; energy: number; fatigue: number;
  activeAt: number; expiresAt: number; retireAt: number;
  stage: 'spawning' | 'idle' | 'collect' | 'deliver' | 'completion' | 'pending';
  task?: { id: string; wakeAt: number; expiresAt: number; request: LogisticsRequest; remaining: number };
  journal?: Journal;
}
export type PaidCourierResult = { status: 'ready'; observation: PaidCourierObservation } | { status: 'deferred'; reason: string };
