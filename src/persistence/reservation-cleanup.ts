import type { StatePort } from './versioned-state';
import { createReservations } from './reservations/store';
import { createQuantityReservations } from './quantities/store';
/** Shared lifecycle cleanup; each store remains responsible for its own booking semantics. */
export function createReservationCleanup(port: StatePort) {
  const stores = () => [
    ...(port.read('reservations/empire') === undefined ? [] : [createReservations(port)]),
    ...(port.read('quantity-reservations/empire') === undefined ? [] : [createQuantityReservations(port)]),
  ];
  return {
    releaseHolder: (holder: string) => stores().reduce((count, store) => count + store.releaseHolder(holder), 0),
    releaseScope: (scope: string) => stores().reduce((count, store) => count + store.releaseScope(scope), 0),
    expire: (tick: number) => stores().reduce((count, store) => count + store.expire(tick), 0),
  };
}
