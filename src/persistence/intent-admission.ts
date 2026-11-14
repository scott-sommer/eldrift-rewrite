import { openState, saveState } from './versioned-state';
import type { StatePort, StateSchema } from './versioned-state';
interface Debit { pool: string; amount: number }
interface Admission { owner: string; keys: string[]; debit: Debit | null }
interface AdmissionState { tick: number; entries: Admission[] }
const schema: StateSchema<AdmissionState> = {
  owner: 'structure-intents', version: 1, initial: () => ({ tick: -1, entries: [] }), migrations: {},
  valid(value: unknown): value is AdmissionState {
    if (!value || typeof value !== 'object') return false;
    const state = value as AdmissionState;
    return Number.isSafeInteger(state.tick) && state.tick >= -1 && Array.isArray(state.entries)
      && state.entries.length <= 1000 && state.entries.every(validEntry);
  },
};
function validEntry(entry: Admission): boolean {
  return !!entry && typeof entry.owner === 'string' && entry.owner.length > 0
    && Array.isArray(entry.keys) && entry.keys.length > 0 && entry.keys.every(key => typeof key === 'string' && key.length > 0)
    && (entry.debit === null || validDebit(entry.debit));
}
function validDebit(debit: Debit): boolean {
  return !!debit && typeof debit.pool === 'string' && debit.pool.length > 0 && Number.isSafeInteger(debit.amount) && debit.amount >= 0;
}
/** Reserve before effects; rejection/exception retains admission until the next tick. Not a success receipt. */
export function createIntentAdmission(port: StatePort, clock: () => number) {
  const key = 'structure-intents/dispatch';
  function current(): AdmissionState {
    const tick = clock();
    if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid intent tick');
    const state = openState(port, key, schema);
    if (state.tick > tick) throw new Error('Intent clock moved backwards');
    return state.tick === tick ? state : { tick, entries: [] };
  }
  function spent(state: AdmissionState, pool: string): number {
    return state.entries.reduce((sum, entry) => sum + (entry.debit?.pool === pool ? entry.debit.amount : 0), 0);
  }
  return {
    used: (identity: string) => current().entries.some(entry => entry.keys.includes(identity)),
    remaining: (pool: string, available: number) => Math.max(0, available - spent(current(), pool)),
    admit(owner: string, keys: readonly string[], budget?: Debit & { available: number }): boolean {
      const entry: Admission = { owner, keys: [...new Set(keys)], debit: budget ? { pool: budget.pool, amount: budget.amount } : null };
      if (!validEntry(entry)) throw new Error('Invalid intent admission');
      if (budget && (!Number.isSafeInteger(budget.available) || budget.available < 0)) throw new Error('Invalid intent budget');
      const state = current();
      if (state.entries.length >= 1000 || state.entries.some(existing => existing.keys.some(identity => entry.keys.includes(identity)))) return false;
      if (budget && budget.amount > budget.available - spent(state, budget.pool)) return false;
      saveState(port, key, schema, { tick: state.tick, entries: [...state.entries, entry] });
      return true;
    },
  };
}
