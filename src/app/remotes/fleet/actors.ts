import { fleetServicePlan, fleetServiceOptions } from './service-policy';
import type { RemoteFleetBirthPolicy } from '../startup/model';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../config/model';
import type { TaskDefinition } from '../../../persistence/tasks/schema';
import type { EmpireFeature } from '../../runtime-model';
import type { createNativeDispatch } from '../../native-dispatch';
import { createRemoteActorCursor } from '../../../features/remotes/fleet/actor-cursor';
import { remoteFleetIdentity } from '../../../features/remotes/fleet/identity';
import { createRemoteFleetStore } from '../../../features/remotes/fleet/store';
import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import { resolveRemoteFleetAssignment } from '../../../features/remotes/fleet/authority';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../../features/remotes/assignment-demand';
import type { RemoteMiningDemand } from '../mining-task';
import { createNativeRemoteMiningCycle } from '../native-mining-cycle';
import { createNativeRemoteTransportCycle } from '../native-transport-cycle';
import { nativeRemoteTraversalFor } from '../management/policy';
import { settleRemoteFleetTransfers } from './confirmations';
import { remoteFleetWorkEnabled } from './spawn-policy';
import { healthyRemoteActor } from './health';
export function createNativeRemoteActors(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, config: (home: string) => Readonly<RuntimeConfig>,
  definitions: Readonly<Record<string,TaskDefinition>>, services?: RemoteFleetBirthPolicy['service']): EmpireFeature {
  const cursor = createRemoteActorCursor(state);
  return { id: 'remote-actors',scope: 'empire',urgency: 'urgent',interval: 1,run(context) {
    const groups = actorGroups();
    if (!groups.length) return;
    settleRemoteFleetTransfers(state,groups.flatMap(group => group.creeps),definitions);
    const budget = Math.max(context.config.values.remoteWorkerCpuBudget,...[...context.rooms.values()].map(room => room.values.remoteWorkerCpuBudget));
    const deadline = Math.min(Game.cpu.getUsed()+budget,Game.cpu.tickLimit*0.9), guard = () => Game.cpu.getUsed() < deadline;
    for (const group of cursor.order(groups)) {
      if (!guard()) break;
      const policy = context.rooms.get(group.name)?.values ?? config(group.name);
      runHomeActors(state,dispatch,group.name,group.creeps,policy,definitions,guard,services);
      cursor.save(group.name);
    }
  } };
}
function actorGroups(): { name: string; creeps: Creep[] }[] {
  const groups = new Map<string,Creep[]>();
  for (const creep of Object.values(Game.creeps)) {
    if (!creep.my || creep.spawning || typeof creep.id !== 'string') continue;
    const identity = remoteFleetIdentity(creep.memory.population?.owner ?? '');
    if (!identity) continue;
    if (!groups.has(identity.home)) groups.set(identity.home,[]);
    groups.get(identity.home)!.push(creep);
  }
  return [...groups].map(([name,creeps]) => ({ name,creeps }));
}
function runHomeActors(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, home: string, creeps: Creep[], policy: Readonly<RuntimeConfig>,
  definitions: Readonly<Record<string,TaskDefinition>>, parentGuard: () => boolean, services?: RemoteFleetBirthPolicy['service']): void {
  const deadline = Game.cpu.getUsed()+policy.remoteWorkerCpuBudget, guard = () => parentGuard() && Game.cpu.getUsed() < deadline;
  const profiles = createRemoteFleetStore(state,home).read().actors, assignments = createRemoteAssignmentStore(state), cursor = createRemoteActorCursor(state,home);
  for (const creep of cursor.order(creeps)) {
    if (!guard()) break;
    const owner = creep.memory.population!.owner, identity = remoteFleetIdentity(owner)!, profile = profiles.find(actor => actor.owner === owner);
    const selected = actorService(profile,policy,services), service = fleetServiceOptions(selected);
    const lease = selected !== null && active(creep,profile,policy) ? resolveRemoteFleetAssignment(assignments,profile!,Game.time) : undefined;
    const demand = lease && remoteAssignmentDemands(lease,Game.time).find((item): item is RemoteMiningDemand => item.kind === 'mine' && item.source === identity.source);
    const options = { maximumRooms: policy.remoteMaximumRouteRooms,guard,policy: (_home: string,username: string) => nativeRemoteTraversalFor(username,policy) };
    const binding = { home,owner };
    if (identity.kind === 'miner') createNativeRemoteMiningCycle(state,dispatch,binding,{ ...options,...service.mining },definitions).run(creep,demand);
    else createNativeRemoteTransportCycle(state,dispatch,binding,{ ...options,minimumBatch: policy.remoteMinimumBatch,requestLifetime: policy.remoteTripLifetime,...service.transport },definitions).run(creep,demand);
    cursor.save(creep.name);
  }
}
function active(creep: Creep, profile: RemoteFleetProfile | undefined, config: Readonly<RuntimeConfig>): boolean {
  return !!profile?.desired && remoteFleetWorkEnabled(config)
    && healthyRemoteActor(creep,profile) && (creep.ticksToLive ?? 0) > profile.retireTicks;
}

function actorService(profile: RemoteFleetProfile | undefined, config: Readonly<RuntimeConfig>, services: RemoteFleetBirthPolicy['service']) {
  return profile && services ? fleetServicePlan(profile,services(profile,config)) : undefined;
}
