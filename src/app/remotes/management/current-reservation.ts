import type { StatePort } from '../../../persistence/versioned-state';
import type { RemoteManagementRequest } from '../../../features/remotes/management/model';
import type { ReservationQuote } from '../../../features/remotes/reservation/model';
import { equalReservationEconomics } from '../../../features/remotes/reservation/quote-validation';
import { createNativeReservationQuote } from '../reservation/native-quote';
import type { ReservationQuoteOptions } from '../reservation/quote-context';
/** Requote current controller/body/topology under admission; cached room prices cannot bypass live authority. */
export function createCurrentReservationAdmission(state: StatePort, request: RemoteManagementRequest, options: ReservationQuoteOptions,
  guard: () => boolean) {
  let quoteCurrent: ReturnType<typeof createNativeReservationQuote> | undefined;
  return (quote: ReservationQuote, admitted: () => boolean): boolean => {
    const ready = () => guard() && admitted();
    if (!ready()) return false;
    quoteCurrent ??= createNativeReservationQuote(state,options);
    const current = quoteCurrent({ home: request.home,room: quote.room,tick: Game.time,bodyBudget: quote.body.cost,
      minimumBufferTicks: quote.policy.minimumBufferTicks,replacementMargin: quote.policy.replacementMargin,traversal: request.policy.traversal },ready);
    return current.status === 'quoted' && sameReservation(quote,current) && ready();
  };
}
function sameReservation(previous: ReservationQuote, current: ReservationQuote): boolean {
  return previous.travel.identity === current.travel.identity && previous.body.parts.join(',') === current.body.parts.join(',')
    && Object.entries(previous.policy).every(([key,value]) => current.policy[key as keyof typeof current.policy] === value)
    && equalReservationEconomics(previous.economics,current.economics);
}
