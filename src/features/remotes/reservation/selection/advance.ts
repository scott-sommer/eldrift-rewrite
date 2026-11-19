import { copyPlain } from '../../../../persistence/plain-data';
import { validReservationQuote } from '../quote-validation';
import type { ReservationCandidate, ReservationSelectionRecord, ReservationSelectionRequest, ReservationQuotePort } from './model';
/** Publish complete quote sweeps together so partial price refresh cannot restart every management scan. */
export function advanceReservationSelection(record: ReservationSelectionRecord, request: ReservationSelectionRequest, quote: ReservationQuotePort, guard: () => boolean): boolean {
  let changed = false;
  for (let count=0; count<Math.min(request.reads,record.entries.length) && guard(); count++) {
    const index = record.next%record.entries.length, entry = record.entries[index]!;
    const next = refresh(entry,record.home,request,quote,guard);
    if (!next) break;
    record.entries[index] = next; record.next = (index+1)%record.entries.length; changed = true;
    if (record.next === 0) record.published = copyPlain(record.entries);
  }
  return changed;
}
function refresh(entry: ReservationCandidate, home: string, request: ReservationSelectionRequest, quote: ReservationQuotePort, guard: () => boolean): ReservationCandidate | undefined {
  if (entry.checkedAt !== null && request.tick-entry.checkedAt < request.refreshInterval) return entry;
  const result = quote(entry.room,guard);
  if (!guard()) return undefined;
  if (result.status === 'deferred') return entry;
  if (result.status === 'infeasible') return { room: entry.room,checkedAt: request.tick,quote: null };
  if (!validReservationQuote(result,home,entry.room,request.tick)) throw new Error('Invalid reservation quotation');
  const stable = entry.quote && request.tick-entry.quote.observedAt < request.maximumAge/2
    && JSON.stringify({ ...entry.quote,observedAt: 0 }) === JSON.stringify({ ...result,observedAt: 0 });
  return { room: entry.room,checkedAt: request.tick,quote: stable ? entry.quote : result };
}
