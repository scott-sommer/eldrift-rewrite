import type { RemoteBirthPermit } from '../startup/model';
import { remoteFleetDemand } from '../../../features/remotes/fleet/demand';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RoomFeature } from '../../runtime-model';
import type { createNativeDispatch } from '../../native-dispatch';
import { createRemoteFleetStore } from '../../../features/remotes/fleet/store';
import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { applyPopulationDemand } from '../../../features/population/apply-demand';
import { createSpawnQueue } from '../../../features/population/spawn-queue';
import { reconcileDemand } from '../../../capabilities/spawning/demand';
import { observePopulation } from '../../../adapters/screeps/population';
import { createRemoteObservationRefresh } from '../native-observations';
import { nativeRemoteRoute } from '../native-route';
import { nativeRemoteTarget } from '../native-target';
import { nativeRemoteTraversal } from '../management/policy';
import { resolveRemoteFleetAssignment } from '../../../features/remotes/fleet/authority';
import { remoteFleetBodyAllowed, remoteFleetSpawningEnabled } from './spawn-policy';
import { healthyRemoteActor } from './health';
export function createNativeRemoteRecruitment(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, permit: RemoteBirthPermit = () => true): RoomFeature {
  const assignments = createRemoteAssignmentStore(state), refresh = createRemoteObservationRefresh(state);
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
      if (!guard()) break;
      reconcileProfile(state,dispatch,profile,target,roster.filter(unit => unit.owner !== profile.owner || healthyRemoteActor(Game.creeps[unit.name]!,profile)),config.remoteSpawnRequestLifetime);
      processed++;
    }
    if (processed) {
      const present = new Set([...roster.filter(unit => unit.room === home).map(unit => unit.owner),...createSpawnQueue(state,home).list().map(request => request.owner)]);
      const actors = record.actors.filter(actor => actor.desired > 0 || present.has(actor.owner));
      store.save(record.revision,Game.time,actors,record.next+processed); dispatch.activate();
    }
  } };
}
function reconcileProfile(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, profile: RemoteFleetProfile, desired: number,
  units: ReturnType<typeof observePopulation>, lifetime: number): void {
  const plan = remoteFleetDemand(profile,desired,lifetime);
  const queue = createSpawnQueue(state,profile.home);
  for (const request of queue.list().filter(request => request.owner === profile.owner && JSON.stringify(request.body) !== JSON.stringify(profile.body))) queue.cancel(request.id,profile.owner);
  const pending = queue.list(), decision = reconcileDemand(plan,units,pending,Game.time);
  if (pending.length-decision.cancel.length+decision.missing <= 200) applyPopulationDemand(state,plan,units,Game.time);
  else for (const id of decision.cancel) queue.cancel(id,profile.owner);
  if (desired > 0) return;
  for (const spawn of Object.values(Game.spawns).filter(spawn => spawn.room.name === profile.home)) {
    const name = spawn.spawning?.name;
    if (name && Game.creeps[name]?.memory.population?.owner === profile.owner) dispatch.structures.cancelSpawning(spawn,name,profile.owner);
  }
}

function cancelFleetSpawns(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, home: string, actors: RemoteFleetProfile[]): void {
  const owners = new Set(actors.map(actor => actor.owner));
  createSpawnQueue(state,home).cancelOwners(owners);
  for (const spawn of Object.values(Game.spawns).filter(spawn => spawn.room.name === home)) {
    const name = spawn.spawning?.name, owner = name && Game.creeps[name]?.memory.population?.owner;
    if (name && owner && owners.has(owner)) dispatch.structures.cancelSpawning(spawn,name,owner);
  }
}
