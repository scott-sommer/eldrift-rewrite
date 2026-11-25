import type { Position } from '../../../../movement/step';
import type { BodyPart } from '../../../../spawning/body';
import type { HouseholdLaborJob } from './model';
export interface LaborTravelPlan {
  home: string; body: readonly BodyPart[]; kind: HouseholdLaborJob['kind']; load: number; remainingLoad: number; workTicks: number;
  spawn: { position: Position; exit: Position }; source: { position: Position; pickup: Position }; target: { position: Position; service: Position };
}
export interface LaborTravelLeg { kind: 'approach' | 'loaded' | 'return'; origin: Position; destination: Position; body: readonly BodyPart[]; load: number }
export interface LaborRoute { path: Position[]; terrain: (1 | 2 | 10)[]; operations: number }
export type LaborTravelMeasure = (leg: Readonly<LaborTravelLeg>, guard: () => boolean) => ({ status: 'complete' } & LaborRoute) | { status: 'deferred'; reason: string };
