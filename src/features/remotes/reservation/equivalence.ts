import type { ReservationQuote } from './model';
import { equalReservationEconomics } from './quote-validation';
/** Observation time can advance without changing a controller/body/service price. */
export function sameReservationQuote(previous: ReservationQuote, current: ReservationQuote): boolean {
  return previous.home === current.home && previous.room === current.room && controllerKey(previous.controller) === controllerKey(current.controller) && previous.travel.identity === current.travel.identity
    && previous.body.parts.join(',') === current.body.parts.join(',')
    && Object.entries(previous.policy).every(([key,value]) => current.policy[key as keyof typeof current.policy] === value)
    && equalReservationEconomics(previous.economics,current.economics);
}

function controllerKey(target: ReservationQuote['controller']): string {
  return JSON.stringify([target.id,target.position.room,target.position.x,target.position.y]);
}
