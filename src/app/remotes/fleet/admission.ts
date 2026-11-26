import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import type { RemoteFleetBirthPolicy } from '../startup/model';
import { sameSpawnPlacement } from '../../../capabilities/spawning/placement';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../config/model';
import type { SpawnRequest } from '../../../capabilities/spawning/request';
import { remoteFleetIdentity } from '../../../features/remotes/fleet/identity';
import { createRemoteFleetStore } from '../../../features/remotes/fleet/store';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { createRemoteObservationRefresh } from '../native-observations';
import { nativeRemoteRoute } from '../native-route';
import { nativeRemoteTarget } from '../native-target';
import { remoteFleetBodyAllowed, remoteFleetSpawningEnabled } from './spawn-policy';
import { nativeRemoteTraversal } from '../management/policy';
/** Final dispatcher admission fences queued work even when recruitment's bounded scan has not reached its owner. */
export function admitRemoteFleetSpawn(state: StatePort, request: SpawnRequest, config: (home: string) => Readonly<RuntimeConfig>,births?: RemoteFleetBirthPolicy): boolean {
  const identity = remoteFleetIdentity(request.owner);
  if (!identity) return !request.owner.startsWith('remote-fleet:');
  const policy = config(identity.home), home = Game.rooms[identity.home];
  if (!home || !remoteFleetSpawningEnabled(policy) || !remoteFleetBodyAllowed(request.body,identity.kind,home,policy)) return false;
  if (request.room !== identity.home || (request.home ?? request.room) !== identity.home) return false;
  const profile = createRemoteFleetStore(state,identity.home).read().actors.find(actor => actor.owner === request.owner);
  if (!profile?.desired || JSON.stringify(profile.body) !== JSON.stringify(request.body)) return false;
  const lease = createRemoteAssignmentStore(state).owner(identity.room,Game.time);
  if (lease?.home !== identity.home || lease.generation !== profile.generation || !lease.plan.sources.includes(identity.source)) return false;
  if (!selectedBirthAllows(births,profile,request,policy)) return false;
  createRemoteObservationRefresh(state)([identity.home,identity.room]);
  if (!nativeRemoteTarget(state,identity.room,home.controller!.owner!.username)) return false;
  return !!nativeRemoteRoute(state,identity.home,identity.room,nativeRemoteTraversal(home,policy),policy.remoteMaximumRouteRooms,false,() => true);
}

function selectedBirthAllows(births: RemoteFleetBirthPolicy | undefined, profile: RemoteFleetProfile, request: SpawnRequest, config: Readonly<RuntimeConfig>): boolean {
  const selected = births?.current(profile,config);
  if (selected === null || selected && !sameSpawnPlacement(request.placement,selected)) return false;
  return births?.admit?.(profile,request,config) ?? true;
}
