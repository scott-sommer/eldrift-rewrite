import type { RemoteServiceMovement } from '../service-movement';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../config/model';
import type { TaskDefinition } from '../../../persistence/tasks/schema';
import type { createNativeDispatch } from '../../native-dispatch';
import type { RemoteMiningDemand } from '../mining-task';
import { createNativeRemoteMiningCycle } from '../native-mining-cycle';
import { createNativeRemoteTransportCycle } from '../native-transport-cycle';
import { nativeRemoteTraversalFor } from '../management/policy';
import type { fleetServiceOptions } from './service-policy';
interface ActorCycle { run(creep: Creep, demand?: RemoteMiningDemand): void }
interface ActorCyclePorts {
  serviceMovement?: RemoteServiceMovement; state: StatePort; dispatch: ReturnType<typeof createNativeDispatch>; home: string; policy: Readonly<RuntimeConfig>;
  definitions: Readonly<Record<string,TaskDefinition>>; guard(): boolean; trace?(owner: string, unit: string, phase: string): void;
}
/** One home/tick scope; same-owner actors share observation and task-runner setup without retaining stale policy or guards. */
export function createActorCycles(ports: ActorCyclePorts) {
  const cycles = new Map<string,ActorCycle>(), { state,dispatch,home,policy,definitions,guard } = ports;
  return (owner: string, kind: 'miner' | 'courier', service: ReturnType<typeof fleetServiceOptions>): ActorCycle => {
    const key = JSON.stringify([owner,service]), cached = cycles.get(key); if (cached) return cached;
    const options = { maximumRooms: policy.remoteMaximumRouteRooms,guard,policy: (_home: string,username: string) => nativeRemoteTraversalFor(username,policy) };
    const binding = { home,owner };
    const cycle = kind === 'miner' ? createNativeRemoteMiningCycle(state,dispatch,binding,{ ...options,...service.mining },definitions)
      : createNativeRemoteTransportCycle(state,dispatch,binding,{ ...options,minimumBatch: policy.remoteMinimumBatch,requestLifetime: policy.remoteTripLifetime,...service.transport,...(ports.serviceMovement ? { serviceMovement: ports.serviceMovement } : {}),...(ports.trace ? { trace: (unit: string,phase: string) => ports.trace!(owner,unit,phase) } : {}) },definitions);
    cycles.set(key,cycle); return cycle;
  };
}
