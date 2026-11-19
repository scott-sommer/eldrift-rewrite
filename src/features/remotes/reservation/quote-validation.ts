import { assessReservationEconomics } from '../../../capabilities/economy/reservation-economics';
import { bufferedReserver } from '../../../capabilities/spawning/reservation-recipes';
import type { ReservationEconomics } from '../../../capabilities/economy/reservation-model';
import { object, natural } from '../assignment-validation';
import { validWorldPosition } from '../../../core/geometry/world-position';
import { validateRemoteRoute } from '../travel-validation';
import type { ReservationQuote } from './model';
export function validReservationQuote(value: unknown, home: string, room: string, tick: number): value is ReservationQuote {
  try { return validQuote(value,home,room,tick); } catch { return false; }
}
function validQuote(value: unknown, home: string, room: string, tick: number): boolean {
  if (!validIdentity(value,home,room,tick)) return false;
  if (!validController(value.controller,room) || !validInputs(value)) return false;
  const quote = value as unknown as ReservationQuote;
  if (!validTravel(quote)) return false;
  const price = assessReservationEconomics({ ...quote.policy,body: quote.body.parts });
  if (price.status !== 'evaluated' || !equalReservationEconomics(quote.economics,price)) return false;
  return validBody(quote,price) && validCommitment(quote,price);
}
function validIdentity(value: unknown, home: string, room: string, tick: number): value is Record<string,unknown> {
  return object(value) && value.status === 'quoted' && value.home === home && value.room === room
    && natural(value.observedAt) && value.observedAt <= tick;
}
function validController(value: unknown, room: string): boolean {
  return object(value) && typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 256
    && validWorldPosition(value.position) && value.position.room === room;
}
function validInputs(value: Record<string,unknown>): boolean {
  return object(value.policy) && object(value.body) && Array.isArray(value.body.parts) && object(value.travel);
}
function validBody(quote: ReservationQuote, price: ReservationEconomics): boolean {
  const body = bufferedReserver(Number.MAX_SAFE_INTEGER,price.claims);
  return !!body && quote.body.parts.join(',') === body.parts.join(',') && quote.body.cost === body.cost && quote.body.spawnTicks === body.spawnTicks;
}
function validTravel(quote: ReservationQuote): boolean {
  const travel = quote.travel;
  if (travel.status !== 'complete' || travel.profile !== 'balanced-claim-move' || !natural(travel.operations)
    || typeof travel.identity !== 'string' || !travel.identity || travel.identity.length > 100000) return false;
  validateRemoteRoute(travel.rooms,quote);
  return travel.outboundTicks === quote.policy.outboundTicks && travel.returnTicks === quote.policy.returnTicks;
}
function validCommitment(quote: ReservationQuote, price: ReservationEconomics): boolean {
  return object(quote.commitment) && quote.commitment.atomic === false && quote.commitment.slots === 1
    && quote.commitment.energyPerTick === price.energyPerTick && quote.commitment.spawnLoad === price.spawnLoad;
}
export function equalReservationEconomics(actual: unknown, expected: ReservationEconomics): boolean {
  if (!object(actual) || !object(actual.timing)) return false;
  const timing = actual.timing;
  return Object.entries(expected).every(([key,value]) => key === 'timing' ? Object.entries(expected.timing).every(([part,number]) => timing[part] === number) : actual[key] === value);
}
