import type { ObservationStore } from './store';
import type { ObserverConfig } from '../../../config/observers';
import { natural, room } from './validation';
/** Ordered assigned scans retain legacy rotation; specialist requests use the same action queue. */
export function refreshObservations(home: string, config: Readonly<ObserverConfig>, tick: number,
  maximumReads: number, store: ObservationStore, guard: () => boolean) {
  if (!room(home) || !natural(tick) || !natural(maximumReads)) throw new Error('Invalid observer refresh request');
  const rooms = [...new Set(config.observerAssignedRooms)];
  if (rooms.length > 64 || !rooms.every(room)) throw new Error('Invalid observer assigned rooms');
  if (!config.observersEnabled || !rooms.length || !maximumReads || !guard()) return { scanned: 0, submitted: false };
  const state = store.read(), previous = state.cursors.find(item => item.home === home)?.room;
  const start = previous === undefined ? 0 : (rooms.indexOf(previous) + 1) % rooms.length;
  let scanned = 0, submitted = false, cursor: string | undefined;
  for (let offset = 0; offset < rooms.length && scanned < maximumReads && guard(); offset++) {
    const target = rooms[(start + offset) % rooms.length]!;
    scanned++; cursor = target;
    if (!due(home, target, tick, config, state)) continue;
    submitted = store.submit({ id: `observer-refresh:${home}:${target}:${tick}`, owner: `observer-refresh:${home}`,
      home, room: target, priority: -100, requestedAt: tick, expiresAt: tick + config.observerRequestLifetime }, tick);
    break;
  }
  if (cursor !== undefined) {
    const current = store.read(), next = { home, room: cursor };
    store.update(current.revision, saved => { saved.cursors = [...saved.cursors.filter(item => item.home !== home), next].slice(-128); });
  }
  return { scanned, submitted };
}
function due(home: string, target: string, tick: number, config: Readonly<ObserverConfig>, state: ReturnType<ObservationStore['read']>): boolean {
  const matches = (request: { home: string; room: string }) => request.home === home && request.room === target;
  if (state.requests.some(matches) || state.flights.some(item => matches(item.request))) return false;
  const previous = [...state.receipts].reverse().find(item => matches(item.request));
  if (!previous) return true;
  const interval = previous.outcome === 'observed' ? config.observerRefreshInterval : config.observerFailureDelay;
  const attemptedAt = previous.outcome === 'observed' ? previous.issuedAt! : previous.completedAt;
  return tick - attemptedAt >= interval;
}
