import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import { remotePopulationIdentity } from '../reachability/identity';
import { remoteFleetIdentity } from '../../../features/remotes/fleet/identity';
import { createRemoteFleetStore } from '../../../features/remotes/fleet/store';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { resolveRemoteFleetAssignment } from '../../../features/remotes/fleet/authority';
import { bodyCost } from '../../../capabilities/spawning/body';
import type { SpawnRequest } from '../../../capabilities/spawning/request';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../config/model';
import type { RemoteBirthPermit, StartupStructures } from './model';
import { createStartupSurvey } from './survey';
import { startupPhaseAllows } from './phase';
import { committedSourceCrewEnergy, sourceBirthNeeded } from './commitments';
import { startupCapitalAllows } from './capital';
/** Optional staged strategy shares producer and final read-only admission; eager preserves existing behavior. */
export function createNativeRemoteStartup(state: StatePort, structures: StartupStructures, settings: (home: string) => Readonly<RuntimeConfig>) {
  const survey = createStartupSurvey(), assignments = createRemoteAssignmentStore(state);
  function evaluate(owner: string, body: SpawnRequest['body'], config: Readonly<RuntimeConfig>, final: boolean): boolean {
    if (config.remoteStartupPolicy === 'eager') return true;
    const identity = remotePopulationIdentity(owner); if (!identity) return true;
    const home = Game.rooms[identity.home]; if (!home?.controller?.my) return false;
    const profiles = createRemoteFleetStore(state,identity.home).read().actors.filter(profile => profile.desired > 0 && !!resolveRemoteFleetAssignment(assignments,profile,Game.time));
    const cohort = sourceCohortDecision(profiles,owner,final);
    if (cohort !== undefined) return cohort;
    if (!startupPhaseAllows(state,owner,config,profiles,survey)) return false;
    return startupCapitalAllows(state,structures,home,config.remoteStartupEnergyReserve,bodyCost(body),committedSourceCrewEnergy(profiles,owner));
  }
  const permit: RemoteBirthPermit = (owner,body,config) => {
    if (config.remoteStartupPolicy === 'eager' || !remotePopulationIdentity(owner)) return true;
    return paidBirth(owner) || evaluate(owner,body,config,false);
  };
  return { permit,admit(request: SpawnRequest): boolean {
    const identity = remotePopulationIdentity(request.owner);
    return !identity || evaluate(request.owner,request.body,settings(identity.home),true);
  } };
}

function paidBirth(owner: string): boolean {
  return Object.values(Game.creeps).some(creep => creep.my && creep.spawning && creep.memory.population?.owner === owner);
}

function sourceCohortDecision(profiles: readonly RemoteFleetProfile[], owner: string, final: boolean): boolean | undefined {
  if (!remoteFleetIdentity(owner)) return undefined;
  if (!profiles.some(profile => profile.owner === owner)) return false;
  return sourceBirthNeeded(profiles,owner) ? undefined : !final;
}
