import type { Outcome } from '../../../core/execution/model';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RemoteOutpostDemand } from '../../../features/remotes/infrastructure/model';
import type { RemoteTaskPorts } from '../task';
import type { createNativeDispatch } from '../../native-dispatch';
import { createNativeRemoteMovement } from '../native-movement';
import type { NativeRemoteOptions } from '../native-movement';
import { createNativeRemoteInfrastructureWork } from './work-service';
export interface RemoteConstructionSupply { collect(creep: Creep, home: string, owner: string): Outcome }
/** Empty builders refill at home through injected shared collection; build intents stay in the shared work owner. */
export function createNativeRemoteOutpostService(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, options: NativeRemoteOptions,
  supply: RemoteConstructionSupply): RemoteTaskPorts<Creep,RemoteOutpostDemand> & { available(creep: Creep, demand: RemoteOutpostDemand): boolean } {
  const work = createNativeRemoteInfrastructureWork(state,dispatch,options), travel = createNativeRemoteMovement(state,dispatch,options);
  const retire = (creep: Creep, home: string, owner: string) => travel.retire(creep,home,owner);
  return { clock: () => Game.time,unit: creep => creep.name,retire,
    available: (creep,demand) => !!work.select(creep,demand),
    service(creep, demand, owner) {
      const selected = work.select(creep,demand);
      if (!selected) return retire(creep,demand.home,owner);
      if (creep.store.energy > 0) return work.run(creep,demand,selected.order,owner);
      if (creep.pos.roomName !== demand.home) return retire(creep,demand.home,owner);
      if (!options.guard()) return { status: 'running' };
      dispatch.activate(); return supply.collect(creep,demand.home,owner);
    },
  };
}
