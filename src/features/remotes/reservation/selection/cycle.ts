import type { StatePort } from '../../../../persistence/versioned-state';
import { natural, room } from '../../assignment-validation';
import { createReservationSelectionStore } from './store';
import { advanceReservationSelection } from './advance';
import type { ReservationSelectionRequest, ReservationQuotePort } from './model';
/** Round-robin bounded quotation retains stable prices across management scans and module resets. */
export function createReservationSelection(state: StatePort, home: string, quote: ReservationQuotePort) {
  const store = createReservationSelectionStore(state,home);
  return (request: ReservationSelectionRequest, guard: () => boolean) => {
    validate(request,home);
    const previous = store.read();
    if (request.tick < previous.clock) throw new Error('Reservation selection clock regressed');
    const record = previous.identity === request.identity ? previous : { ...previous,identity: request.identity,next: 0,published: [],
      entries: request.rooms.map(room => ({ room,checkedAt: null,quote: null })) };
    if (record.entries.map(entry => entry.room).join(',') !== request.rooms.join(',')) throw new Error('Reservation selection identity omits candidates');
    const advanced = advanceReservationSelection(record,request,quote,guard);
    if ((advanced || record !== previous) && guard()) { record.clock = request.tick; store.save(previous.revision,record); }
    const current = store.read();
    return current.identity === request.identity ? current.published.filter(entry => entry.quote && request.tick-entry.quote.observedAt <= request.maximumAge) : [];
  };
}
function validate(value: ReservationSelectionRequest, home: string): void {
  if (![value.tick,value.reads,value.refreshInterval,value.maximumAge].every(natural) || value.reads > 64 || value.refreshInterval < 1) throw new Error('Invalid reservation selection bounds');
  if (typeof value.identity !== 'string' || value.identity.length > 100000) throw new Error('Invalid reservation selection identity');
  if (value.rooms.length > 64 || !value.rooms.every(name => room(name) && name !== home) || new Set(value.rooms).size !== value.rooms.length) throw new Error('Invalid reservation candidates');
}
