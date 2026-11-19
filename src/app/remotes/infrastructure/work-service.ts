import type { StatePort } from '../../../persistence/versioned-state';
import type { WorkOrder } from '../../../capabilities/work/assessment';
import type { RemoteOutpostDemand } from '../../../features/remotes/infrastructure/model';
import type { createNativeDispatch } from '../../native-dispatch';
import { createNativeWork } from '../../../adapters/screeps/work-execution';
import { createNativeRemoteWorkContext } from './work-context';
import type { NativeRemoteOptions } from '../native-movement';
/** Selection is advisory; execution obtains a fresh lease/route/site view before any intent. */
export function createNativeRemoteInfrastructureWork(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, options: NativeRemoteOptions) {
  const context = createNativeRemoteWorkContext(state,options);
  return { select: context,
    run(creep: Creep, demand: RemoteOutpostDemand, order: WorkOrder, owner: string) {
      const work = createNativeWork(dispatch.arbiter,dispatch.movement,(unit,input) => {
        const view = context(unit,demand,input.id);
        return view && sameOrder(input,view.order) ? view.policy : undefined;
      });
      if (!options.guard()) return { status: 'running' as const };
      dispatch.activate(); return work(creep,order,owner);
    },
  };
}
function sameOrder(input: WorkOrder, actual: WorkOrder): boolean {
  return input.id === actual.id && input.kind === 'build' && input.position.room === actual.position.room
    && input.position.x === actual.position.x && input.position.y === actual.position.y;
}
