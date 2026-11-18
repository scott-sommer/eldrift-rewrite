import { assessRemoteEconomics } from '../../capabilities/economy/remote-economics';
import type { RemoteBundle, RemotePortfolio, RemotePortfolioPolicy, RemoteQuote, RemoteRoomOffer } from './portfolio-model';
/** Reprice the whole selected room after every membership change, never just the new source. */
export function priceRemoteBundle(offer: RemoteRoomOffer, quotes: RemoteQuote[], policy: RemotePortfolioPolicy): RemoteBundle | undefined {
  if (!quotes.length) return undefined;
  const sources = quotes.map(quote => priceSource(quote,quotes.length));
  if (sources.some(source => !source)) return undefined;
  const complete = quotes.length === offer.sourceIds.length;
  if (offer.commitment.atomic && !complete) return undefined;
  const selected = sources.filter(source => source !== undefined);
  const netRate = selected.reduce((sum,source) => sum + source.economics.netRate,0) - offer.commitment.energyPerTick;
  const spawnLoad = selected.reduce((sum,source) => sum + source.economics.spawn.total,0) + offer.commitment.spawnLoad;
  const haulers = selected.reduce((sum,source) => sum + source.economics.haulers,0);
  const rank = netRate * (complete ? 1 + policy.completionBonus : 1);
  if (![netRate,spawnLoad,haulers,rank].every(Number.isFinite)) throw new Error('Remote bundle overflow');
  const distances = quotes.map(quote => quote.assessment.travel.minerTicks);
  return { room: offer.room,complete,atomic: offer.commitment.atomic,slots: quotes.length + offer.commitment.slots,
    sources: selected,netRate,spawnLoad,haulers,closestTravel: Math.min(...distances),
    totalTravel: distances.reduce((sum,value) => sum + value,0),rank };
}
function priceSource(quote: RemoteQuote, shares: number) {
  const facts = quote.assessment, policy = facts.policy;
  const economics = assessRemoteEconomics({ ...policy,capacity: facts.sourceFacts.capacity,
    miner: { ...policy.miner,travelTicks: facts.travel.minerTicks },
    hauler: { ...policy.hauler,outboundTicks: facts.travel.outboundTicks,returnTicks: facts.travel.returnTicks },
    reservation: { ...policy.reservation,shares } });
  if (economics.status !== 'evaluated' || !economics.accepted) return undefined;
  return { id: facts.id,home: facts.home,room: facts.room,source: facts.source,observedAt: facts.observedAt,economics };
}
export function totalRemotePortfolio(bundles: RemoteBundle[], policy: RemotePortfolioPolicy): RemotePortfolio {
  return { home: policy.home,tick: policy.tick,bundles,
    slots: bundles.reduce((sum,item) => sum + item.slots,0),haulers: bundles.reduce((sum,item) => sum + item.haulers,0),
    spawnLoad: bundles.reduce((sum,item) => sum + item.spawnLoad,0),netRate: bundles.reduce((sum,item) => sum + item.netRate,0) };
}
export function affordableRemotePortfolio(bundles: RemoteBundle[], policy: RemotePortfolioPolicy): boolean {
  const total = totalRemotePortfolio(bundles,policy);
  if (![total.slots,total.haulers,total.spawnLoad,total.netRate].every(Number.isFinite)) return false;
  return total.slots <= policy.maximumSlots && total.haulers <= policy.maximumHaulers
    && total.spawnLoad <= policy.maximumSpawnLoad;
}
