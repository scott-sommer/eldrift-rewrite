import type { ObservationStore } from './store';
import type { ObservationFlight, ObservationOutcome, ObservationReceipt } from './model';
import { natural, text } from './validation';
export function prepareObservation(store: ObservationStore, id: string, observer: string, tick: number): ObservationFlight | undefined {
  if (!natural(tick) || !text(observer)) throw new Error('Invalid observation action identity');
  const state = store.read(), request = state.requests.find(item => item.id === id);
  if (!request || request.requestedAt > tick || request.expiresAt <= tick + 1 || state.flights.length >= 32) return;
  if (state.flights.some(item => item.observer === observer)
    || state.receipts.some(item => item.observer === observer && item.issuedAt === tick)) return;
  const flight: ObservationFlight = { request, observer, issuedAt: tick, code: null };
  return store.update(state.revision, next => {
    next.requests = next.requests.filter(item => item.id !== id);
    next.flights.push(flight);
  }) ? flight : undefined;
}
export function acceptObservation(store: ObservationStore, flight: ObservationFlight, code: number): boolean {
  if (!Number.isSafeInteger(code)) throw new Error('Invalid observation native result');
  const state = store.read(), current = state.flights.find(item => sameFlight(item, flight));
  if (!current) return false;
  return store.update(state.revision, next => { next.flights.find(item => sameFlight(item, flight))!.code = code; });
}
export function finishObservation(store: ObservationStore, flight: ObservationFlight, tick: number,
  outcome: ObservationOutcome, code?: number | null): boolean {
  const state = store.read(), current = state.flights.find(item => sameFlight(item, flight));
  if (!current) return false;
  const receipt: ObservationReceipt = { ...current, completedAt: tick, outcome, code: code === undefined ? current.code : code };
  return store.update(state.revision, next => {
    next.flights = next.flights.filter(item => !sameFlight(item, flight));
    next.receipts = [...next.receipts, receipt].slice(-128);
  });
}
export function expireObservation(store: ObservationStore, id: string, tick: number): boolean {
  const state = store.read(), request = state.requests.find(item => item.id === id);
  if (!request || request.expiresAt > tick) return false;
  return store.update(state.revision, next => {
    next.requests = next.requests.filter(item => item.id !== id);
    next.receipts = [...next.receipts, { request, observer: null, issuedAt: null, completedAt: tick,
      outcome: 'expired' as const, code: null }].slice(-128);
  });
}
function sameFlight(a: ObservationFlight, b: ObservationFlight): boolean {
  return a.request.id === b.request.id && a.observer === b.observer && a.issuedAt === b.issuedAt;
}
