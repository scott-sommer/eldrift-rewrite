import { object, natural } from '../assignment-validation';
import { validReservationQuote } from './quote-validation';
import { reservationCommitment } from './room-offer';
import type { RemoteRoomOffer } from '../portfolio-model';
export function validateOfferReservation(offer: RemoteRoomOffer, home: string, tick: number): void {
  if (offer.reservation === undefined) return;
  if (offer.quotes.some(quote => quote.assessment.policy.reservation.energyPerTick !== 0 || quote.assessment.policy.reservation.spawnLoad !== 0)) throw new Error('Duplicate per-source reservation charge');
  if (offer.reservation === null) return;
  const selected = offer.reservation;
  if (!object(selected) || !validReservationQuote(selected.quote,home,offer.room,tick) || !validBase(selected.baseCommitment)) throw new Error('Invalid room reservation quote');
  const expected = reservationCommitment(selected.baseCommitment,selected.quote.commitment);
  if (Object.entries(expected).some(([key,value]) => offer.commitment[key as keyof typeof expected] !== value)) throw new Error('Invalid room reservation charge');
}
function validBase(value: unknown): boolean {
  return object(value) && typeof value.atomic === 'boolean' && natural(value.slots)
    && [value.energyPerTick,value.spawnLoad].every(number => typeof number === 'number' && Number.isFinite(number) && number >= 0);
}
