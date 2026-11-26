import type { RemoteStartupAdmission } from '../../../capabilities/spawning/admission';
import { sameSpawnPlacement } from '../../../capabilities/spawning/placement';
import { remoteFleetDemand } from '../../../features/remotes/fleet/demand';
import { applyPopulationDemand } from '../../../features/population/apply-demand';
import { createSpawnQueue } from '../../../features/population/spawn-queue';
import { reconcileDemand } from '../../../capabilities/spawning/demand';
import { healthyRemoteActor } from './health';
import type { observePopulation } from '../../../adapters/screeps/population';
import type { RemoteFleetBirthPolicy, RemoteBirthSelection } from '../startup/model';
import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import type { RuntimeConfig } from '../../../config/model';
import type { StatePort } from '../../../persistence/versioned-state';
import type { createNativeDispatch } from '../../native-dispatch';
/** Birth planning never owns fleet state or cancels a paid body just because new planning is pending. */
export function createRemoteProfileRecruitment(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, births?: RemoteFleetBirthPolicy) {
  return (profile: RemoteFleetProfile, target: number, roster: ReturnType<typeof observePopulation>, config: Readonly<RuntimeConfig>, guard: () => boolean): boolean => {
    if (!guard()) return false;
    const placement = target > 0 ? prepareBirth(births,profile,config,guard) : undefined;
    if (!guard()) return false;
    const healthy = roster.filter(unit => unit.owner !== profile.owner || healthyRemoteActor(Game.creeps[unit.name]!,profile));
    reconcileProfile(state,dispatch,profile,placement === null ? 0 : target,healthy,config.remoteSpawnRequestLifetime,placement,births?.cohort?.(profile,config));
    return true;
  };
}
function reconcileProfile(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, profile: RemoteFleetProfile, desired: number,
  units: ReturnType<typeof observePopulation>, lifetime: number, placement: RemoteBirthSelection, admission?: RemoteStartupAdmission): void {
  const plan = { ...remoteFleetDemand(profile,desired,lifetime),...(placement ? { placement } : {}),...(admission ? { admission } : {}) };
  const queue = createSpawnQueue(state,profile.home);
  for (const request of queue.list().filter(request => request.owner === profile.owner && request.admission?.kind !== 'remote-startup' && (JSON.stringify(request.body) !== JSON.stringify(profile.body) || !sameSpawnPlacement(request.placement,plan.placement)))) queue.cancel(request.id,profile.owner);
  const pending = queue.list(), decision = reconcileDemand(plan,units,pending,Game.time);
  if (pending.length-decision.cancel.length+decision.missing <= 200) applyPopulationDemand(state,plan,units,Game.time);
  else for (const id of decision.cancel) queue.cancel(id,profile.owner);
  if (desired > 0 || placement === null) return;
  for (const spawn of Object.values(Game.spawns).filter(spawn => spawn.room.name === profile.home)) {
    const name = spawn.spawning?.name;
    if (name && Game.creeps[name]?.memory.population?.owner === profile.owner) dispatch.structures.cancelSpawning(spawn,name,profile.owner);
  }
}

function prepareBirth(policy: RemoteFleetBirthPolicy | undefined, profile: RemoteFleetProfile, config: Parameters<RemoteFleetBirthPolicy['current']>[1], guard: () => boolean) {
  if (!policy) return undefined;
  return policy.prepare ? policy.prepare(profile,config,guard) : policy.current(profile,config);
}
