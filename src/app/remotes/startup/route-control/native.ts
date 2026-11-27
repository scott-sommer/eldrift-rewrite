import { createMatrixSnapshots } from '../../../../adapters/screeps/matrix-snapshots';
import { createNativePaidCourierOpening } from '../motion-observation/native-opening';
import { paidContinuationContext } from '../projection/motion/continuation-context';
import { createPaidCourierRouteControl } from './control';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { createMovementService } from '../../../../adapters/screeps/movement-service';
import type { RuntimeConfig } from '../../../../config/model';
/** Caller supplies a fully qualified paid context, before any runtime actor dispatch. */
export function createNativePaidCourierRouteControl(state: StatePort,movement: Pick<ReturnType<typeof createMovementService>,'follow'>,configuration: (home: string) => Readonly<RuntimeConfig>) {
  const observe = createNativePaidCourierOpening(state),snapshots = createMatrixSnapshots();
  return createPaidCourierRouteControl(state,movement,(context,guard) => {
    const current = observe(context,guard); if (current.status === 'deferred') return current;
    const facts = paidContinuationContext(state,context,current.opening,configuration(context.cohort.home),snapshots,guard);
    if (facts.status === 'deferred') return facts;
    return { status: 'ready',opening: current.opening,routeVersion: facts.version,topologyVersion: facts.matrices.version };
  });
}
