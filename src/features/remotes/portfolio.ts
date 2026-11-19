import { copyPlain } from '../../persistence/plain-data';
import { affordableRemotePortfolio, priceRemoteBundle, totalRemotePortfolio } from './portfolio-pricing';
import { validateRemoteOffers } from './portfolio-validation';
import type { RemoteBundle, RemotePortfolioPolicy, RemoteQuote, RemoteRoomOffer } from './portfolio-model';
/** Bounded greedy policy, not a globally optimal knapsack solver. No assignments or effects occur here. */
export function selectRemotePortfolio(input: RemoteRoomOffer[], inputPolicy: RemotePortfolioPolicy) {
  validateRemoteOffers(input,inputPolicy);
  const offers = copyPlain(input), policy = copyPlain(inputPolicy);
  const eligible = offers.map(offer => ({ ...offer,quotes: freshReservation(offer,policy) ? offer.quotes.filter(quote => freshQuote(quote,policy)) : [] }));
  const selected = new Map<string,RemoteBundle>();
  const full = eligible.map(offer => priceRemoteBundle(offer,offer.quotes,policy))
    .filter((bundle): bundle is RemoteBundle => bundle !== undefined && bundle.complete);
  full.sort((a,b) => compareBundles(a,b,policy));
  for (const bundle of full) tryBundle(bundle,selected,policy);
  selectFragments(eligible,selected,policy);
  const result = totalRemotePortfolio([...selected.values()],policy);
  return result.netRate >= policy.minimumNetYield ? result : totalRemotePortfolio([],policy);
}
function freshReservation(offer: RemoteRoomOffer, policy: RemotePortfolioPolicy): boolean {
  return !offer.reservation || policy.tick-offer.reservation.quote.observedAt <= policy.maximumAge;
}
function freshQuote(quote: RemoteQuote, policy: RemotePortfolioPolicy): boolean {
  const facts = quote.assessment;
  if (policy.tick - facts.observedAt > policy.maximumAge) return false;
  if (facts.reservation.state === 'foreign') return false;
  return facts.reservation.state !== 'ours' || facts.reservation.remainingTicks > policy.tick - facts.reservation.observedAt;
}
function selectFragments(offers: RemoteRoomOffer[], selected: Map<string,RemoteBundle>, policy: RemotePortfolioPolicy): void {
  const fragments = offers.filter(offer => !offer.commitment.atomic && !selected.has(offer.room))
    .flatMap(offer => offer.quotes.map(quote => ({ offer,quote })));
  fragments.sort((a,b) => compareFragments(a,b,policy));
  const chosen = new Map<string,RemoteQuote[]>();
  for (const { offer,quote } of fragments) {
    const quotes = [...(chosen.get(offer.room) ?? []),quote];
    const bundle = priceRemoteBundle(offer,quotes,policy);
    if (bundle && tryBundle(bundle,selected,policy)) chosen.set(offer.room,quotes);
  }
}
function tryBundle(bundle: RemoteBundle, selected: Map<string,RemoteBundle>, policy: RemotePortfolioPolicy): boolean {
  const others = [...selected.values()].filter(item => item.room !== bundle.room);
  if (bundle.netRate < 0 || !affordableRemotePortfolio([...others,bundle],policy)) return false;
  selected.set(bundle.room,bundle);
  return true;
}
function compareBundles(a: RemoteBundle, b: RemoteBundle, policy: RemotePortfolioPolicy): number {
  if (policy.order === 'net-yield') return b.rank - a.rank || a.closestTravel - b.closestTravel || a.room.localeCompare(b.room);
  return a.closestTravel - b.closestTravel || a.totalTravel - b.totalTravel || b.sources.length - a.sources.length
    || b.rank - a.rank || a.room.localeCompare(b.room);
}
function compareFragments(a: { offer: RemoteRoomOffer; quote: RemoteQuote }, b: { offer: RemoteRoomOffer; quote: RemoteQuote }, policy: RemotePortfolioPolicy): number {
  if (policy.order === 'net-yield') {
    const first = priceRemoteBundle(a.offer,[a.quote],policy)?.rank ?? -Infinity;
    const second = priceRemoteBundle(b.offer,[b.quote],policy)?.rank ?? -Infinity;
    if (first !== second) return second - first;
  }
  return compareQuotes(a.quote,b.quote);
}
function compareQuotes(a: RemoteQuote, b: RemoteQuote): number {
  return a.assessment.travel.minerTicks - b.assessment.travel.minerTicks || a.assessment.source.localeCompare(b.assessment.source);
}
