import { createReservations } from '../persistence/reservations/store';
import type { StatePort } from '../persistence/versioned-state';

/** Admit gameplay only after migrations and owned-state maintenance succeed. */
export function createTickAdmission(state: StatePort, migrate: () => boolean, clock: () => number) {
  let lastTick: number | undefined;
  let ready = false;
  return (): boolean => {
    const tick = clock();
    if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid maintenance tick');
    if (lastTick === tick) return ready;
    lastTick = tick;
    ready = false;
    if (!migrate()) return false;
    // Avoid creating an unused namespace in colonies with no claims yet.
    if (state.read('reservations/empire') !== undefined) createReservations(state).expire(tick);
    ready = true;
    return true;
  };
}
