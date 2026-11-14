import { openState, saveState } from '../persistence/versioned-state';
import type { StatePort } from '../persistence/versioned-state';
import { unitRosterSchema } from '../persistence/units/schema';
import type { UnitIdentity } from '../persistence/units/schema';
const key = 'units/creeps';

/** Reconcile the complete owned-creep roster, never room-local visibility. */
export function createUnitLifecycle(port: StatePort, observe: () => readonly UnitIdentity[], retire: (name: string) => void, maximum = 20) {
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid retirement limit');
  return (): boolean => {
    const current = { units: [...observe()] };
    if (!unitRosterSchema.valid(current)) throw new Error('Invalid owned-creep roster');
    const saved = openState(port, key, unitRosterSchema);
    const identities = new Map(current.units.map(unit => [unit.name, unit.id]));
    const pending = saved.units.filter(unit => identities.get(unit.name) !== unit.id);
    for (const unit of pending.slice(0, maximum)) {
      retire(unit.name);
      // Checkpoint after effects: failed writes replay idempotent retirement.
      saved.units = saved.units.filter(previous => previous.name !== unit.name);
      saveState(port, key, unitRosterSchema, saved);
    }
    if (pending.length > maximum) return false;
    if (!sameRoster(saved.units, current.units)) saveState(port, key, unitRosterSchema, current);
    return true;
  };
}
function sameRoster(previous: readonly UnitIdentity[], current: readonly UnitIdentity[]): boolean {
  const ids = new Map(previous.map(unit => [unit.name, unit.id]));
  return previous.length === current.length && current.every(unit => ids.get(unit.name) === unit.id);
}
