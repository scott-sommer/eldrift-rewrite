import { openState, saveState } from '../versioned-state';
import type { StatePort } from '../versioned-state';
import { reservationSchema } from './schema';
import type { Claim } from './schema';
const key = 'reservations/empire';
export function createReservations(port: StatePort) {
  function release(predicate: (claim: Claim) => boolean): number {
    const state = openState(port, key, reservationSchema);
    const before = state.claims.length;
    state.claims = state.claims.filter(claim => !predicate(claim));
    if (state.claims.length !== before) saveState(port, key, reservationSchema, state);
    return before - state.claims.length;
  }
  return {
    acquire(claim: Claim, tick: number): boolean {
      const state = openState(port, key, reservationSchema);
      if (!reservationSchema.valid({ claims: [claim] }) || claim.expiresAt <= tick) throw new Error('Invalid or expired claim');
      const existing = state.claims.find(item => item.resource === claim.resource && item.expiresAt > tick);
      if (existing && (existing.holder !== claim.holder || existing.scope !== claim.scope)) return false;
      state.claims = state.claims.filter(item => item.resource !== claim.resource);
      state.claims.push(claim);
      saveState(port, key, reservationSchema, state);
      return true;
    },
    releaseHolder: (holder: string) => release(claim => claim.holder === holder),
    releaseScope: (scope: string) => release(claim => claim.scope === scope),
    expire: (tick: number) => release(claim => claim.expiresAt <= tick),
  };
}
