import { remoteFleetIdentity } from '../../../features/remotes/fleet/identity';
import { createRemoteFleetStore } from '../../../features/remotes/fleet/store';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { resolveRemoteFleetAssignment } from '../../../features/remotes/fleet/authority';
import type { RemoteFleetIdentity, RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import type { ReachabilityObservation } from '../../../features/remotes/reachability/model';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../config/model';
import { healthyRemoteActor } from '../fleet/health';
import { remoteFleetWorkEnabled } from '../fleet/spawn-policy';
/** Only actual owned creeps and source proximity supply arrival evidence; quotes and room entry do not. */
export function snapshotRemoteReachability(state: StatePort, home: string, config: Readonly<RuntimeConfig>): ReachabilityObservation[] {
  const profiles = createRemoteFleetStore(state,home).read().actors, assignments = createRemoteAssignmentStore(state), result: ReachabilityObservation[] = [];
  for (const creep of Object.values(Game.creeps)) {
    const identity = trackedMiner(creep,home);
    if (!identity) continue;
    const profile = profiles.find(item => item.owner === creep.memory.population!.owner);
    const eligible = !!profile?.desired && remoteFleetWorkEnabled(config) && !!resolveRemoteFleetAssignment(assignments,profile,Game.time);
    result.push(observeMiner(creep,identity,profile,eligible));
  }
  return result;
}
function reachedSource(creep: Creep, identity: RemoteFleetIdentity): boolean {
  const source = Game.getObjectById(identity.source as Id<Source>);
  return !!source && source.pos.roomName === identity.room && creep.pos.inRangeTo(source.pos,1);
}
function healthy(creep: Creep, profile: RemoteFleetProfile | undefined): boolean {
  return !!profile && creep.hits === creep.hitsMax && creep.body.every(part => part.hits === 100) && healthyRemoteActor(creep,profile);
}

function trackedMiner(creep: Creep, home: string): RemoteFleetIdentity | undefined {
  if (!creep.my || !creep.id || creep.memory.population?.home !== home) return undefined;
  const identity = remoteFleetIdentity(creep.memory.population.owner);
  return identity?.kind === 'miner' && identity.home === home ? identity : undefined;
}
function observeMiner(creep: Creep, identity: RemoteFleetIdentity, profile: RemoteFleetProfile | undefined, eligible: boolean): ReachabilityObservation {
  return { name: creep.name,id: creep.id,room: identity.room,source: identity.source,eligible,
    healthy: healthy(creep,profile),spawning: creep.spawning,ttl: creep.ticksToLive ?? 0,
    lifetime: creep.body.some(part => part.type === CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME,reached: reachedSource(creep,identity) };
}
