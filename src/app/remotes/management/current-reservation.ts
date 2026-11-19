import type { StatePort } from '../../../persistence/versioned-state';
import type { RemoteManagementRequest } from '../../../features/remotes/management/model';
import type { ReservationQuote } from '../../../features/remotes/reservation/model';
import { sameReservationQuote } from '../../../features/remotes/reservation/equivalence';
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
    return current.status === 'quoted' && sameReservationQuote(quote,current) && ready();
  };
}
