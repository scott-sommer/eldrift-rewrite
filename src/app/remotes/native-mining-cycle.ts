import type { StatePort } from '../../persistence/versioned-state';
import type { TaskDefinition } from '../../persistence/tasks/schema';
import type { createNativeDispatch } from '../native-dispatch';
import type { NativeRemoteMiningServiceOptions } from './native-mining-service';
import { createNativeRemoteMiningService } from './native-mining-service';
import type { NativeRemoteBankingPolicy } from './native-banking';
import { createNativeRemoteBanking } from './native-banking';
import { eligibleRemoteActor } from './actor';
import type { RemoteActorBinding } from './actor';
import { createRemoteMiningCycle } from './mining-cycle';
export interface NativeRemoteMiningCycleOptions extends NativeRemoteMiningServiceOptions { banking?: NativeRemoteBankingPolicy }
export type RemoteMiningActorBinding = RemoteActorBinding;
/** SDK composition only; shared actor control owns task renewal, banking dispatch and retirement. */
export function createNativeRemoteMiningCycle(state: StatePort,dispatch: ReturnType<typeof createNativeDispatch>,binding: RemoteMiningActorBinding,
  options: NativeRemoteMiningCycleOptions,otherDefinitions: Readonly<Record<string,TaskDefinition>> = {}) {
  if (typeof binding.owner !== 'string' || !binding.owner) throw new Error('Remote mining actor owner is required');
  const service = createNativeRemoteMiningService(state,dispatch,options);
  const banking = createNativeRemoteBanking(state,dispatch,binding.home,options,options.banking);
  return createRemoteMiningCycle(state,binding,{ ...service,
    eligible: creep => eligibleRemoteActor(creep,binding),cargo: creep => creep.store.getUsedCapacity(),lifetime: creep => creep.ticksToLive ?? 1,
    mode: (creep,definitions) => banking.prepare(creep,definitions,['remote-mine']),
  },banking.definitions,otherDefinitions);
}
