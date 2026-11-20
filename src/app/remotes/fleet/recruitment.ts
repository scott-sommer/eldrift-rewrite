import { createRemoteProfileRecruitment } from './recruitment-profile';
import type { RemoteBirthPermit, RemoteFleetBirthPolicy } from '../startup/model';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RoomFeature } from '../../runtime-model';
import type { createNativeDispatch } from '../../native-dispatch';
import { createRemoteFleetStore } from '../../../features/remotes/fleet/store';
import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { createSpawnQueue } from '../../../features/population/spawn-queue';
import { observePopulation } from '../../../adapters/screeps/population';
import { createRemoteObservationRefresh } from '../native-observations';
import { nativeRemoteRoute } from '../native-route';
import { nativeRemoteTarget } from '../native-target';
import { nativeRemoteTraversal } from '../management/policy';
import { resolveRemoteFleetAssignment } from '../../../features/remotes/fleet/authority';
import { remoteFleetBodyAllowed, remoteFleetSpawningEnabled } from './spawn-policy';
export function createNativeRemoteRecruitment(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, permit: RemoteBirthPermit = () => true,births?: RemoteFleetBirthPolicy): RoomFeature {
  const assignments = createRemoteAssignmentStore(state), refresh = createRemoteObservationRefresh(state), reconcileProfile = createRemoteProfileRecruitment(state,dispatch,births);
  return { id: 'remote-recruitment',scope: 'owned',urgency: 'urgent',interval: 1,run(context) {
    const home = context.room.name, store = createRemoteFleetStore(state,home), record = store.read();
    if (!record.actors.length) return;
    const room = Game.rooms[home], config = context.config.values;
    if (!room?.controller?.my) return;
    const deadline = Math.min(Game.cpu.getUsed()+config.remoteWorkerCpuBudget,Game.cpu.tickLimit*0.9), guard = () => Game.cpu.getUsed() < deadline;
    if (!remoteFleetSpawningEnabled(config)) { cancelFleetSpawns(state,dispatch,home,record.actors); return; }
    const safe = new Map<string,boolean>(), roster = observePopulation(); let processed = 0;
    function desired(profile: RemoteFleetProfile): number {
      if (!remoteFleetBodyAllowed(profile.body,profile.kind,room!,config) || !resolveRemoteFleetAssignment(assignments,profile,Game.time)) return 0;
      return reachable(profile.room) && permit(profile.owner,profile.body,config) ? profile.desired : 0;
    }
    function reachable(target: string): boolean {
      if (!safe.has(target)) {
        refresh([home,target]); safe.set(target,nativeRemoteTarget(state,target,room!.controller!.owner!.username) && !!nativeRemoteRoute(state,home,target,nativeRemoteTraversal(room!,config),config.remoteMaximumRouteRooms,false,guard));
      }
      return safe.get(target) ?? false;
    }
    for (let count=0; count<record.actors.length && guard(); count++) {
      const profile = record.actors[(record.next+count)%record.actors.length]!, target = desired(profile);
      if (!reconcileProfile(profile,target,roster,config,guard)) break;
      processed++;
    }
    if (processed) {
      const present = new Set([...roster.filter(unit => unit.room === home).map(unit => unit.owner),...createSpawnQueue(state,home).list().map(request => request.owner)]);
      const actors = record.actors.filter(actor => actor.desired > 0 || present.has(actor.owner));
      store.save(record.revision,Game.time,actors,record.next+processed); dispatch.activate();
    }
  } };
}
function cancelFleetSpawns(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, home: string, actors: RemoteFleetProfile[]): void {
  const owners = new Set(actors.map(actor => actor.owner));
  createSpawnQueue(state,home).cancelOwners(owners);
  for (const spawn of Object.values(Game.spawns).filter(spawn => spawn.room.name === home)) {
    const name = spawn.spawning?.name, owner = name && Game.creeps[name]?.memory.population?.owner;
    if (name && owner && owners.has(owner)) dispatch.structures.cancelSpawning(spawn,name,owner);
  }
}

