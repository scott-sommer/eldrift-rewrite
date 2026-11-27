import type { TransitPlan, TransitState } from '../../../movement/transit/model';
export interface StartupCourierRoutes {
  request: string; activeAt: number; approach: TransitPlan; empty: TransitPlan; loaded: TransitPlan;
}
export interface StartupCourierTrip {
  request: string; phase: 'collect' | 'deliver'; leg: 'approach' | 'empty' | 'loaded'; serviceAt: number; transit: TransitState;
}
