import type { Position } from '../../../movement/step';
import type { StartupCourierRoutes,StartupCourierTrip } from './model';
export interface StartupProjectMotionInput {
  routes: readonly Omit<StartupCourierRoutes,'activeAt'>[];
  terrain: readonly { position: Position; rate: 1 | 2 | 10 }[];
  blockers: readonly { unit: string; position: Position; startAt: number; endAt: number }[];
}
export interface StartupProjectMotionCheckpoint { trips: StartupCourierTrip[] }
