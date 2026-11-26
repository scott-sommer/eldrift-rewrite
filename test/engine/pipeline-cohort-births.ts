import type { PipelineEconomicMemory } from './pipeline-economic';
import { peekSpawnIdentity } from '../../src/features/population/spawn-identity';
import { createRemoteFleetStore } from '../../src/features/remotes/fleet/store';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { RuntimeConfig } from '../../src/config/model';
import type { NativeStartupQuote, StartupBirthProposal } from '../../src/app/remotes/startup/projection/model';
export function calibrationBirths(state: StatePort, quote: NativeStartupQuote, config: Readonly<RuntimeConfig>): StartupBirthProposal[] {
  const profiles = createRemoteFleetStore(state,quote.plan.home).read().actors.filter(profile => profile.source === quote.plan.source);
  const prospective = peekSpawnIdentity(state,quote.plan.home), sequence = Number(prospective.split('-').at(-1)); let offset = 0;
  return profiles.flatMap(profile => Array.from({ length: profile.desired },() => {
    const id = 'ed-'+quote.plan.home+'-'+(sequence+offset++), returned = quote.legs.find(leg => leg.kind === (profile.kind === 'miner' ? 'miner-return' : 'courier-loaded'))!.ticks+1;
    const request = { id,name: id,owner: profile.owner,room: profile.home,body: [...profile.body],priority: profile.priority,readyAt: 0,expiresAt: config.remoteSpawnRequestLifetime };
    const admission = (Memory as PipelineEconomicMemory).pipelineEconomicMode ? { kind: 'remote-startup' as const,generation: profile.generation,observedAt: quote.observedAt } : undefined;
    const base = { request: { ...request,...(admission ? { admission } : {}) },retireTicks: Math.max(profile.retireTicks,returned) };
    return profile.kind === 'miner' ? { ...base,kind: 'miner' as const } : { ...base,kind: 'courier' as const,minimumBatch: config.remoteMinimumBatch };
  }));
}
