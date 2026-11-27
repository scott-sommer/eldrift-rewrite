import type { StartupInitialCourier } from '../../../../../capabilities/economy/startup/initial-model';
import type { StartupProjectMotionInput,StartupProjectCourierOpening } from '../../../../../capabilities/economy/startup/courier-trips/project-model';
import type { PaidCourierOpening } from '../../motion-observation/opening-model';
import type { Position } from '../../../../../capabilities/movement/step';
export interface PaidCourierContinuation {
  observedAt: number; unit: string; source: string; routeVersion: string; topologyVersion: string;
  basis: PaidCourierOpening; initial: StartupInitialCourier; opening: StartupProjectCourierOpening;
  route: StartupProjectMotionInput['routes'][number]; terrain: StartupProjectMotionInput['terrain'];
}
export type PaidCourierContinuationResult = { status: 'ready'; compilation: PaidCourierContinuation } | { status: 'deferred'; reason: string };
export interface PaidCourierContinuationOptions { blocked: readonly Position[] }
