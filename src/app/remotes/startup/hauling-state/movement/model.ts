import type { PaidRetirementRoute } from './retirement';
import type { PaidCourierActiveRoute } from '../../../../../features/remotes/startup/routes/model';
import type { TransitPlan,TransitState } from '../../../../../capabilities/movement/transit/model';
import type { Occupant } from '../../../../../capabilities/movement/traffic/model';
export interface PaidMovementExternalFrame {
  plans: readonly (TransitPlan & { order: string })[];
  states: readonly TransitState[];
  requestedUnits: readonly string[];
  occupants: readonly Occupant[];
}

export interface PaidMovementCheckpoint { tick: number; routes: PaidCourierActiveRoute[]; expected: TransitState[]; retirements?: PaidRetirementRoute[] }
