import { createNativePaidCourierRouteControl } from './native';
import { createNativePaidCourierContinuation } from '../projection/motion/continuation';
import { createPaidRouteServiceMovement } from './service-movement';
import type { PaidRouteMovementOptions } from './service-movement';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { createMovementService } from '../../../../adapters/screeps/movement-service';
import type { RuntimeConfig } from '../../../../config/model';
export function createNativePaidRouteServiceMovement(state: StatePort,movement: ReturnType<typeof createMovementService>,configuration: (home: string) => Readonly<RuntimeConfig>,options: PaidRouteMovementOptions) {
  const control = createNativePaidCourierRouteControl(state,movement,configuration),compile = createNativePaidCourierContinuation(state);
  return createPaidRouteServiceMovement(state,movement,control,(context,guard) => compile(context,configuration(context.cohort.home),{ blocked: [context.plan.station] },guard),options);
}
