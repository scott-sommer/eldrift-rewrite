import type { StateSchema } from '../../../persistence/versioned-state';
import type { ObservationState } from './model';
import { natural, object, room, text, validRequest, validFlight, validReceipt } from './validation';
export const observationSchema: StateSchema<ObservationState> = {
  owner: 'observations', version: 1, migrations: {},
  initial: () => ({ revision: 0, homeCursor: null, requestCursor: null, requests: [], flights: [], receipts: [], cursors: [] }),
  valid(value: unknown): value is ObservationState {
    if (!object(value) || !natural(value.revision)) return false;
    return (value.homeCursor === null || room(value.homeCursor))
      && (value.requestCursor === null || text(value.requestCursor)) && validQueues(value) && validCursors(value.cursors);
  },
};
function validQueues(value: Record<string, unknown>): boolean {
  if (!Array.isArray(value.requests) || value.requests.length > 128 || !value.requests.every(validRequest)) return false;
  if (!Array.isArray(value.flights) || value.flights.length > 32 || !value.flights.every(validFlight)) return false;
  if (!Array.isArray(value.receipts) || value.receipts.length > 128 || !value.receipts.every(validReceipt)) return false;
  return uniqueRequests(value.requests, value.flights, value.receipts);
}
function uniqueRequests(requests: { id: string }[], flights: { request: { id: string }; observer: string }[], receipts: { request: { id: string } }[]): boolean {
  const ids = [...requests.map(item => item.id), ...flights.map(item => item.request.id), ...receipts.map(item => item.request.id)];
  return new Set(ids).size === ids.length && new Set(flights.map(item => item.observer)).size === flights.length;
}
function validCursors(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 128) return false;
  return value.every(item => object(item) && room(item.home) && room(item.room))
    && new Set(value.map(item => item.home)).size === value.length;
}
