import type { TransitPlan, TransitState } from '../../../movement/transit/model';
export interface StartupCourierRoutes {
  opening?: { plan: TransitPlan; phase: 'collect' | 'deliver'; cargo: number; readyAt: number; fatigue: number };
  request: string; activeAt: number; approach: TransitPlan; empty: TransitPlan; loaded: TransitPlan;
}
export interface StartupCourierTrip {
  request: string; phase: 'collect' | 'deliver'; leg: 'approach' | 'empty' | 'loaded' | 'opening'; serviceAt: number; transit: TransitState;
}
