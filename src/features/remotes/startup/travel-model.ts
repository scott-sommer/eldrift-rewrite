import type { Position } from '../../../capabilities/movement/step';
import type { BodyPart } from '../../../capabilities/spawning/body';
import type { StaticTravelLeg } from '../../../capabilities/movement/path-model';
export interface StartupTravelPlan {
  home: string; room: string; source: string;
  spawn: { id: string; position: Position; exit: Position };
  station: Position; collection: Position; endpoint: { id: string; position: Position; deposit: Position };
  miner: readonly BodyPart[]; courier: readonly BodyPart[];
}
export type StartupTravelLegKind = 'miner-approach' | 'miner-return' | 'courier-approach' | 'courier-empty' | 'courier-loaded';
export interface StartupTravelLegRequest { kind: StartupTravelLegKind; origin: Position; destination: Position; range: 0; body: readonly BodyPart[]; load: number; blocked?: readonly Position[] }
export type StartupTravelMeasurement = ({ status: 'complete' } & StaticTravelLeg) | { status: 'deferred'; reason: string };
export type StartupTravelMeasure = (request: StartupTravelLegRequest, guard: () => boolean) => StartupTravelMeasurement;
export type StartupTravelResult =
  | { status: 'complete'; identity: string; plan: StartupTravelPlan; legs: ({ kind: StartupTravelLegKind } & StaticTravelLeg)[]; operations: number }
  | { status: 'deferred'; reason: string; completedLegs: number };
