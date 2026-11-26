import { openState, saveState } from '../versioned-state';
import type { StatePort } from '../versioned-state';
import { quantitySchema, validQuantityClaim } from './schema';
import type { QuantityClaim } from './schema';
const key = 'quantity-reservations/empire';
/** A claim reserves every pool in one write, so stock and sink capacity cannot be half-booked. */
export function createQuantityReservations(port: StatePort) {
  const read = () => openState(port, key, quantitySchema);
  function release(predicate: (claim: QuantityClaim) => boolean): number {
    const state = read();
    const retained = state.claims.filter(claim => !predicate(claim));
    const removed = state.claims.length - retained.length;
    if (removed) saveState(port, key, quantitySchema, { claims: retained });
    return removed;
  }
  return {
    reserve(claim: QuantityClaim, capacities: Readonly<Record<string, number>>, tick: number): boolean {
      validTick(tick);
      if (!validQuantityClaim(claim) || claim.expiresAt <= tick) throw new Error('Invalid quantity claim');
      const state = read();
      const active = state.claims.filter(item => item.expiresAt > tick);
      const existing = active.find(item => item.id === claim.id);
      if (existing && !sameOwner(existing, claim)) throw new Error('Quantity claim identity conflict');
      const retained = active.filter(item => item.id !== claim.id);
      if (!fits(claim, retained, capacities)) return false;
      saveState(port, key, quantitySchema, { claims: [...retained, claim] });
      return true;
    },
    releasePool(identity: Pick<QuantityClaim, 'id' | 'owner' | 'holder' | 'scope'>, pool: string): void {
      const state = read();
      const claim = state.claims.find(item => item.id === identity.id);
      if (!claim) return;
      if (!sameOwner(claim, identity)) throw new Error('Quantity claim identity conflict');
      const retained = claim.allocations.filter(item => item.pool !== pool);
      if (retained.length === claim.allocations.length) return;
      claim.allocations = retained;
      state.claims = state.claims.filter(item => item.allocations.length > 0);
      saveState(port, key, quantitySchema, state);
    },
    list(tick: number): QuantityClaim[] {
      validTick(tick);
      return read().claims.filter(claim => claim.expiresAt > tick);
    },
    releaseScope: (scope: string) => release(claim => claim.scope === scope),
    releaseHolder: (holder: string) => release(claim => claim.holder === holder),
    expire(tick: number): number { validTick(tick); return release(claim => claim.expiresAt <= tick); },
  };
}
function sameOwner(a: Pick<QuantityClaim, 'owner' | 'holder' | 'scope'>, b: Pick<QuantityClaim, 'owner' | 'holder' | 'scope'>): boolean {
  return a.owner === b.owner && a.holder === b.holder && a.scope === b.scope;
}
function fits(claim: QuantityClaim, others: QuantityClaim[], capacities: Readonly<Record<string, number>>): boolean {
  return claim.allocations.map(allocation => {
    const capacity = Object.hasOwn(capacities, allocation.pool) ? capacities[allocation.pool] : undefined;
    if (!Number.isSafeInteger(capacity) || (capacity ?? -1) < 0) throw new Error('Missing or invalid pool capacity');
    const booked = others.flatMap(other => other.allocations).filter(item => item.pool === allocation.pool)
      .reduce((total, item) => total + item.amount, 0);
    return booked + allocation.amount <= capacity!;
  }).every(Boolean);
}
function validTick(tick: number): void {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid quantity reservation tick');
}

