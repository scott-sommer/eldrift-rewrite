import type { TransitPlan } from '../../../movement/transit/model';
import type { Position } from '../../../movement/step';
import type { StartupCourierRoutes,StartupCourierTrip } from './model';
export interface StartupProjectCourierOpening { request: string; owner: string; plan: TransitPlan; readyAt: number; fatigue: number }
export interface StartupProjectMotionInput {
  openings?: readonly StartupProjectCourierOpening[];
  routes: readonly Omit<StartupCourierRoutes,'activeAt' | 'opening'>[];
  terrain: readonly { position: Position; rate: 1 | 2 | 10 }[];
  blockers: readonly { unit: string; position: Position; startAt: number; endAt: number }[];
}
export interface StartupProjectMotionCheckpoint { trips: StartupCourierTrip[] }
