import type { StatePort } from '../../persistence/versioned-state';
import { peekState } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { taskSchema } from '../../persistence/tasks/schema';
import type { TaskDefinition } from '../../persistence/tasks/schema';
import { createTaskRunner } from '../task-runner';
import type { createNativeDispatch } from '../native-dispatch';
import { createRemoteMiningTaskBehavior } from './mining-task';
import type { RemoteMiningDemand } from './mining-task';
import { createNativeRemoteMiningService } from './native-mining-service';
import type { NativeRemoteBankingPolicy } from './native-banking';
import { createNativeRemoteBanking } from './native-banking';
import type { NativeRemoteOptions } from './native-movement';
import { eligibleRemoteActor } from './actor';
import type { RemoteActorBinding } from './actor';
import { assignRemoteTask } from './assign-task';
export interface NativeRemoteMiningCycleOptions extends NativeRemoteOptions { banking?: NativeRemoteBankingPolicy }
export type RemoteMiningActorBinding = RemoteActorBinding;
/** One actor cycle and runner own source service, safe-home banking and empty retirement. Recruitment stays separate. */
export function createNativeRemoteMiningCycle(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, binding: RemoteMiningActorBinding,
  options: NativeRemoteMiningCycleOptions, otherDefinitions: Readonly<Record<string,TaskDefinition>> = {}) {
  const { home,owner } = binding;
  if (typeof owner !== 'string' || !owner) throw new Error('Remote mining actor owner is required');
  const service = createNativeRemoteMiningService(state,dispatch,options);
  const banking = createNativeRemoteBanking(state,dispatch,home,options,options.banking);
  const behaviors = { 'remote-mine': createRemoteMiningTaskBehavior(state,service),...banking.definitions };
  const definitions = { ...otherDefinitions,...behaviors };
  const execute = createTaskRunner(state,behaviors,() => Game.time,definitions);
  function queued(creep: Creep): boolean {
    return (peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,definitions))?.queue.length ?? 0) > 0;
  }
  function prepareService(creep: Creep, demand?: RemoteMiningDemand): boolean {
    if (!queued(creep) && creep.store.getUsedCapacity() > 0) {
      service.retire(creep,home,'remote-return:' + creep.name); return false;
    }
    if (demand?.home === home) assignRemoteTask(state,definitions,'remote-mine',creep.name,demand,Game.time,creep.ticksToLive ?? 1);
    return true;
  }
  return { definitions,
    run(creep: Creep, demand?: RemoteMiningDemand): void {
      if (!eligibleRemoteActor(creep,binding)) return;
      const mode = banking.prepare(creep,definitions,['remote-mine']);
      if (mode === 'hold') return;
      if (mode === 'service' && !prepareService(creep,demand)) return;
      if (queued(creep)) execute(creep.name,creep);
      else if (mode === 'service') service.retire(creep,home,'remote-return:' + creep.name);
    },
  };
}
