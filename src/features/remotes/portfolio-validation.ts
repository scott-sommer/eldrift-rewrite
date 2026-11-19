import { validateOfferReservation } from './reservation/offer-validation';
import { roomCoordinates } from '../../core/geometry/room-grid';
import { framedIdentity } from '../../core/framed-identity';
import { validateRemoteTravel } from './travel-validation';
import type { RemotePortfolioPolicy, RemoteRoomOffer, RemoteQuote } from './portfolio-model';
export function validateRemoteOffers(offers: RemoteRoomOffer[], policy: RemotePortfolioPolicy): void {
  roomCoordinates(policy.home);
  if (![policy.tick,policy.maximumAge,policy.maximumSlots,policy.maximumHaulers].every(natural)) throw new Error('Invalid remote portfolio clock or capacity');
  validateWorkforce(policy.maximumUnits);
  validateSourceCapacity(policy.maximumSources);
  if (![policy.maximumSpawnLoad,policy.completionBonus].every(rate) || !rate(policy.minimumNetYield)) throw new Error('Invalid remote portfolio rates');
  if (!['nearest','net-yield'].includes(policy.order)) throw new Error('Invalid remote portfolio strategy');
  if (offers.length > 64 || offers.reduce((sum,offer) => sum + offer.quotes.length,0) > 128) throw new Error('Remote portfolio input limit');
  if (new Set(offers.map(offer => offer.room)).size !== offers.length) throw new Error('Duplicate remote room offer');
  const sources = new Set<string>();
  for (const offer of offers) validateOffer(offer,policy,sources);
}
function validateOffer(offer: RemoteRoomOffer, policy: RemotePortfolioPolicy, sources: Set<string>): void {
  roomCoordinates(offer.room);
  if (offer.room === policy.home) throw new Error('Home cannot be a remote');
  validateInventory(offer);
  const quoted = new Set<string>();
  for (const quote of offer.quotes) {
    validateQuote(quote,offer,policy);
    const source = quote.assessment.source;
    if (quoted.has(source) || sources.has(source)) throw new Error('Duplicate remote source quote');
    quoted.add(source); sources.add(source);
  }
  validateReservationCosts(offer.quotes);
  validateOfferReservation(offer,policy.home,policy.tick);
}
function validateQuote(quote: RemoteQuote, offer: RemoteRoomOffer, policy: RemotePortfolioPolicy): void {
  const facts = quote.assessment;
  if (facts.home !== policy.home || facts.room !== offer.room || !offer.sourceIds.includes(facts.source)) throw new Error('Remote quote ownership mismatch');
  if (facts.id !== 'remote-source:' + framedIdentity([policy.home,facts.source]) || facts.sourceFacts.id !== facts.source) throw new Error('Remote quote identity mismatch');
  if (!natural(facts.observedAt) || facts.observedAt > policy.tick) throw new Error('Invalid remote quote clock');
  validateRemoteTravel(facts.travel,{ home: policy.home,room: offer.room });
}
function validateReservationCosts(quotes: RemoteQuote[]): void {
  const first = quotes[0]?.assessment.policy.reservation;
  if (quotes.some(quote => quote.assessment.policy.reservation.energyPerTick !== first?.energyPerTick
    || quote.assessment.policy.reservation.spawnLoad !== first?.spawnLoad)) throw new Error('Inconsistent room reservation charge');
}
function natural(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
function rate(value: number): boolean { return Number.isFinite(value) && value >= 0; }
function text(value: string): boolean { return typeof value === 'string' && value.length > 0 && value.length <= 256; }

function validateInventory(offer: RemoteRoomOffer): void {
  if (!offer.sourceIds.length || offer.sourceIds.length > 16 || new Set(offer.sourceIds).size !== offer.sourceIds.length) throw new Error('Invalid remote source inventory');
  if (!offer.sourceIds.every(text)) throw new Error('Invalid remote source identity');
  const cost = offer.commitment;
  if (typeof cost.atomic !== 'boolean' || !natural(cost.slots) || !rate(cost.energyPerTick) || !rate(cost.spawnLoad)) throw new Error('Invalid remote commitment');
}

function validateWorkforce(value: number | undefined): void {
  if (value !== undefined && (!natural(value) || value > 1000)) throw new Error('Invalid remote workforce budget');
}

function validateSourceCapacity(value: number | undefined): void {
  if (value !== undefined && (!natural(value) || value > 128)) throw new Error('Invalid remote source budget');
}
