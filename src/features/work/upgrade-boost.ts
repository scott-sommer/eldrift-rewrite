import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
interface Attempt { unit: string; tick: number; before: number; unavailable: boolean }
interface BoostState { attempt: Attempt | null }
export interface BoostObservation { id: string; boosted: number }
const schema: StateSchema<BoostState> = {
  owner: 'upgrade-boost', version: 1, initial: () => ({ attempt: null }), migrations: {},
  valid(value: unknown): value is BoostState {
    if (!value || typeof value !== 'object' || !('attempt' in value)) return false;
    if (value.attempt === null) return true;
    const attempt = value.attempt as Attempt;
    return !!attempt && typeof attempt.unit === 'string' && attempt.unit.length > 0
      && [attempt.tick, attempt.before].every(number => Number.isSafeInteger(number) && number >= 0)
      && typeof attempt.unavailable === 'boolean';
  },
};
/** Persist before issuing; OK alone never settles a boost. */
export function createUpgradeBoost(state: StatePort, room: string) {
  const key = stateKey('upgrade-boost', room);
  const read = () => openState(state, key, schema);
  return {
    settled(tick: number, units: readonly BoostObservation[]): string[] {
      const attempt = read().attempt;
      if (!attempt || tick <= attempt.tick) return [];
      const unit = units.find(unit => unit.id === attempt.unit);
      return unit && (attempt.unavailable || unit.boosted > attempt.before) ? [unit.id] : [];
    },
    consume(ids: readonly string[]): void {
      const attempt = read().attempt;
      if (attempt && ids.includes(attempt.unit)) saveState(state, key, schema, { attempt: null });
    },
    issue(tick: number, unit: BoostObservation, invoke: () => number): number | undefined {
      if (read().attempt?.tick === tick) return undefined;
      const attempt = { unit: unit.id, tick, before: unit.boosted, unavailable: false };
      saveState(state, key, schema, { attempt });
      const code = invoke();
      // Legacy explicitly skips an unavailable boost; retain this distinct from observed success.
      if (code === -6) saveState(state, key, schema, { attempt: { ...attempt, unavailable: true } });
      return code;
    },
  };
}
