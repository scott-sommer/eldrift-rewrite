import type { StartupInitialState } from '../../../../capabilities/economy/startup/initial-model';
import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import type { StartupDeliveryInput } from '../../../../capabilities/economy/startup/delivery-model';
import type { NativeStartupQuote, NativeStartupProjectionOptions } from './model';
/** Uses only observed stocks and explicit finite birth/refill/expense schedules. */
export function startupProjectionInput(quote: NativeStartupQuote, options: NativeStartupProjectionOptions, requests: readonly SpawnRequest[], initial: StartupInitialState | undefined): StartupDeliveryInput {
  const facts = quote.facts, station = facts.station.facts;
  const legs = new Map(quote.legs.map(leg => [leg.kind,leg.ticks]));
  const workers = options.births.filter(proposal => proposal.kind === 'miner').map(proposal => ({ request: proposal.request.id,travelTicks: legs.get('miner-approach')!,retireTicks: proposal.retireTicks }));
  const couriers = options.births.filter(proposal => proposal.kind === 'courier').map(proposal => ({ request: proposal.request.id,retireTicks: proposal.retireTicks,minimumBatch: proposal.minimumBatch,
    initialOutboundTicks: legs.get('courier-approach')!,outboundTicks: legs.get('courier-empty')!,returnTicks: legs.get('courier-loaded')!,turnaroundTicks: 1,collectionTicks: 1,deliveryTicks: 1 }));
  return { ...(initial ? { initial } : {}),containerCapacity: station.status === 'ready' ? station.capacity-Math.min(station.energy,station.claimedEnergy) : CONTAINER_CAPACITY,couriers,
    container: containerFacts(quote,options),homeSink: { capacity: facts.endpoint.capacity,freeCapacity: facts.endpoint.availableCapacity,changes: options.sinkChanges },
    project: { remainingProgress: station.remainingProgress,workers,source: { energy: facts.source.energy,capacity: facts.source.capacity,regenerationTicks: ENERGY_REGEN_TIME,regenerationIn: facts.source.regenerationIn },
      spawning: { room: facts.home,requests,spawns: facts.spawns.map(spawn => ({ id: spawn.id,room: facts.home,availableAt: spawn.remainingTime })),liveNames: new Set(Object.keys(Game.creeps)),unaffordable: options.unaffordable,
        funding: { capacity: facts.stock.spawnCapacity,initialEnergy: Math.min(facts.stock.availableSpawnEnergy,facts.stock.availableEnergy),refills: options.refills },
        cash: { homeEnergy: facts.stock.availableEnergy,protectedEnergy: options.protectedEnergy,horizon: options.horizon,readyAt: 0,selfHarvestedConstruction: station.remainingProgress,flows: options.householdFlows } } } };
}
function containerFacts(quote: NativeStartupQuote, options: NativeStartupProjectionOptions) {
  const station = quote.facts.station.facts, ready = station.status === 'ready' ? station : undefined;
  const interval = CONTAINER_DECAY_TIME-1;
  return { hits: ready?.hits ?? CONTAINER_HITS,hitsMax: ready?.hitsMax ?? CONTAINER_HITS,decayAmount: CONTAINER_DECAY,decayInterval: interval,
    decayIn: ready?.ticksToDecay ?? interval,repairPolicy: options.repairPolicy };
}
