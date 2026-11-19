import { bodyCost } from '../../../capabilities/spawning/body';
import { reconcileDemand } from '../../../capabilities/spawning/demand';
import { remoteFleetDemand } from '../../../features/remotes/fleet/demand';
import type { RemoteFleetProfile, RemoteFleetIdentity } from '../../../features/remotes/fleet/model';
import { remoteFleetIdentity } from '../../../features/remotes/fleet/identity';
import { healthyRemoteActor } from '../fleet/health';
import { observePopulation } from '../../../adapters/screeps/population';
import { framedIdentity } from '../../../core/framed-identity';
/** Due source workers remain a liability even when already queued. This is a read model, not a second booking ledger. */
export function committedSourceCrewEnergy(profiles: readonly RemoteFleetProfile[], requesting: string): number {
  const active = new Set(Object.values(Game.creeps).filter(creep => creep.my).map(creep => remoteFleetIdentity(creep.memory.population?.owner ?? ''))
    .filter((identity): identity is RemoteFleetIdentity => identity !== undefined).map(key));
  const current = remoteFleetIdentity(requesting);
  if (current?.kind === 'miner') active.add(key(current));
  const roster = observePopulation();
  return profiles.filter(profile => active.has(key(profile))).reduce((total,profile) => {
    const missing = missingBirths(profile,roster);
    return total+Math.max(0,missing-Number(profile.owner === requesting))*bodyCost(profile.body);
  },0);
}
function key(identity: RemoteFleetIdentity): string { return framedIdentity([identity.home,identity.room,identity.source]); }

export function sourceBirthNeeded(profiles: readonly RemoteFleetProfile[], owner: string): boolean {
  const profile = profiles.find(item => item.owner === owner);
  return !!profile && missingBirths(profile,observePopulation()) > 0;
}
function missingBirths(profile: RemoteFleetProfile, roster: ReturnType<typeof observePopulation>): number {
  const healthy = roster.filter(unit => unit.owner !== profile.owner || Game.creeps[unit.name]!.spawning || healthyRemoteActor(Game.creeps[unit.name]!,profile));
  return reconcileDemand(remoteFleetDemand(profile,profile.desired,1),healthy,[],Game.time).missing;
}
