import { healthyRemoteActor } from '../../fleet/health';
import { reconcileDemand } from '../../../../capabilities/spawning/demand';
import { remoteFleetDemand } from '../../../../features/remotes/fleet/demand';
import { createRemoteFleetStore } from '../../../../features/remotes/fleet/store';
import { peekSpawnIdentity } from '../../../../features/population/spawn-identity';
import { observePopulation } from '../../../../adapters/screeps/population';
import { peekState } from '../../../../persistence/versioned-state';
import { spawnQueueSchema } from '../../../../features/population/spawn-schema';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { RemoteFleetProfile } from '../../../../features/remotes/fleet/model';
import type { NativeStartupQuote, StartupBirthProposal } from '../projection/model';
export function missingStartupBirths(state: StatePort, profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>) {
  const pending = peekState(state,'spawning/'+profile.home,spawnQueueSchema(profile.home))?.requests ?? [];
  return reconcileDemand(remoteFleetDemand(profile,profile.desired,config.remoteSpawnRequestLifetime),observePopulation().filter(unit => unit.owner !== profile.owner || healthyRemoteActor(Game.creeps[unit.name]!,profile)),pending,Game.time).missing;
}
export function proposeEconomicBirths(state: StatePort, quote: NativeStartupQuote, config: Readonly<RuntimeConfig>): StartupBirthProposal[] {
  const profiles = createRemoteFleetStore(state,quote.plan.home).read().actors.filter(profile => profile.room === quote.plan.room && profile.source === quote.plan.source && profile.generation === quote.facts.authority?.generation);
  const needs = profiles.map(profile => ({ profile,count: missingStartupBirths(state,profile,config) }));
  if (needs.reduce((sum,item) => sum+item.count,0) > 64) return [];
  const sequence = Number(peekSpawnIdentity(state,quote.plan.home).split('-').at(-1)); let offset = 0;
  return needs.flatMap(({ profile,count }) => Array.from({ length: count },() => {
    const id = 'ed-'+profile.home+'-'+(sequence+offset++), readyAt = config.remoteStartupPlanningLead;
    const request = { id,name: id,owner: profile.owner,room: profile.home,body: [...profile.body],priority: profile.priority,readyAt,expiresAt: readyAt+config.remoteSpawnRequestLifetime,
      admission: { kind: 'remote-startup' as const,generation: profile.generation,observedAt: quote.observedAt } };
    const returned = quote.legs.find(leg => leg.kind === (profile.kind === 'miner' ? 'miner-return' : 'courier-loaded'))!.ticks+1;
    const base = { request,retireTicks: Math.max(profile.retireTicks,returned) };
    return profile.kind === 'miner' ? { ...base,kind: 'miner' as const } : { ...base,kind: 'courier' as const,minimumBatch: config.remoteMinimumBatch };
  }));
}
