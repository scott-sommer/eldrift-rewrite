import { createRemoteReachabilityStore } from '../../../features/remotes/reachability/store';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RemoteManagementRequest } from '../../../features/remotes/management/model';
import type { SpawnRequest } from '../../../capabilities/spawning/request';
import { remotePopulationIdentity } from './identity';
export function excludeUnreachableRooms(state: StatePort, request: RemoteManagementRequest): RemoteManagementRequest {
  const blocked = new Set(createRemoteReachabilityStore(state,request.home).read().blocked.map(item => item.room));
  if (!blocked.size) return request;
  return { ...request,policy: { ...request.policy,candidates: request.policy.candidates.filter(candidate => !blocked.has(candidate.room)) } };
}
export function admitReachableRemoteSpawn(state: StatePort, request: SpawnRequest): boolean {
  const identity = remotePopulationIdentity(request.owner);
  return !identity || !createRemoteReachabilityStore(state,identity.home).read().blocked.some(item => item.room === identity.room);
}
