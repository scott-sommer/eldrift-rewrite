import type { BodyPart } from '../../../../capabilities/spawning/body';
import type { TransitPlan } from '../../../../capabilities/movement/transit/model';
import type { ObservedTransitCursor } from '../../../../capabilities/movement/transit/observed';
import type { Position } from '../../../../capabilities/movement/step';
export interface PaidCourierRouteProgram {
  home: string; room: string; source: string; generation: number; endpoint: string;
  name: string; unit: string; owner: string; body: BodyPart[];
  activeAt: number; retireAt: number; expiresAt: number; activatedAt: number;
  routeVersion: string; topologyVersion: string;
  opening: { plan: TransitPlan; phase: 'collect' | 'deliver'; readyAt: number; energy: number; fatigue: number; spawning: boolean };
  empty: TransitPlan; loaded: TransitPlan;
}
export interface PaidCourierActiveRoute {
  program: PaidCourierRouteProgram; leg: 'opening' | 'empty' | 'loaded'; phase: 'collect' | 'deliver';
  readyAt: number; energy: number; fatigue: number; cursor: ObservedTransitCursor | null;
}
export interface PaidCourierRouteRecord { home: string; revision: number; clock: number; routes: PaidCourierActiveRoute[] }
export interface PaidCourierRouteObservation {
  tick: number; name: string; unit: string; position: Position; phase: 'spawning' | 'collect' | 'deliver'; readyAt: number; energy: number; fatigue: number;
}
