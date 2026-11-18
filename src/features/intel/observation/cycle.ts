import { copyPlain } from '../../../persistence/plain-data';
import type { ObservationFlight, ObservationRequest, ObservationUnit } from './model';
import type { ObservationStore } from './store';
import { acceptObservation, expireObservation, finishObservation, prepareObservation } from './transitions';
import { natural } from './validation';
export interface ObservationCyclePorts {
  store: ObservationStore;
  capture(room: string): boolean;
  issue(observer: string, request: ObservationRequest): number;
  failure(request: ObservationRequest, error: unknown): void;
}
export interface ObservationCycleBudget { captures: number; issues: number; scans: number }
export function settleObservations(tick: number, budget: ObservationCycleBudget, ports: ObservationCyclePorts, guard: () => boolean) {
  validateBudget(tick, budget);
  let scanned = 0, captures = 0;
  for (const flight of ports.store.read().flights) {
    if (scanned >= budget.scans || !guard()) break;
    scanned++;
    if (tick < flight.issuedAt) throw new Error('Observation clock moved backwards');
    if (tick === flight.issuedAt) continue;
    if (flight.request.expiresAt <= tick) finishObservation(ports.store, flight, tick, 'expired');
    else if (tick > flight.issuedAt + 1) finishObservation(ports.store, flight, tick, 'missed');
    else if (captures < budget.captures) { captures++; captureFlight(ports, flight, tick); }
  }
  return { scanned, captures };
}
export function dispatchObservations(tick: number, budget: ObservationCycleBudget, units: readonly ObservationUnit[],
  ports: ObservationCyclePorts, enabled: (home: string) => boolean, guard: () => boolean) {
  validateBudget(tick, budget);
  let scanned = 0, issues = 0;
  const saved = ports.store.read(), used = new Set<string>();
  const requests = saved.requests.sort((a,b) => b.priority - a.priority || a.requestedAt - b.requestedAt || a.id.localeCompare(b.id));
  const cursor = requests.findIndex(request => request.id === saved.requestCursor);
  const start = requests.length <= budget.scans ? 0 : cursor + 1;
  let last: string | undefined;
  for (const request of [...requests.slice(start), ...requests.slice(0, start)]) {
    if (scanned >= budget.scans || !guard()) break;
    scanned++; last = request.id;
    if (request.requestedAt > tick) throw new Error('Observation clock moved backwards');
    if (request.expiresAt <= tick) { expireObservation(ports.store, request.id, tick); continue; }
    if (issues >= budget.issues || !enabled(request.home)) continue;
    const unit = units.find(item => item.home === request.home && !used.has(item.id));
    if (!unit) continue;
    const flight = prepareObservation(ports.store, request.id, unit.id, tick);
    if (!flight) continue;
    used.add(unit.id); issues++;
    issueFlight(ports, flight, tick);
  }
  if (last !== undefined) {
    const current = ports.store.read();
    if (current.requestCursor !== last) ports.store.update(current.revision, next => { next.requestCursor = last; });
  }
  return { scanned, issues };
}
function captureFlight(ports: ObservationCyclePorts, flight: ObservationFlight, tick: number): void {
  try { finishObservation(ports.store, flight, tick, ports.capture(flight.request.room) ? 'observed' : 'missed'); }
  catch (error) { finishObservation(ports.store, flight, tick, 'exception'); report(ports, flight.request, error); }
}
function issueFlight(ports: ObservationCyclePorts, flight: ObservationFlight, tick: number): void {
  try {
    const code = ports.issue(flight.observer, copyPlain(flight.request));
    if (code === 0) acceptObservation(ports.store, flight, code);
    else finishObservation(ports.store, flight, tick, 'rejected', code);
  } catch (error) { finishObservation(ports.store, flight, tick, 'exception'); report(ports, flight.request, error); }
}
function report(ports: ObservationCyclePorts, request: ObservationRequest, error: unknown): void {
  try { ports.failure(request, error); } catch { /* Other requests survive a broken report sink. */ }
}
function validateBudget(tick: number, budget: ObservationCycleBudget): void {
  if (![tick, budget.captures, budget.issues, budget.scans].every(natural)) throw new Error('Invalid observation cycle budget');
}
