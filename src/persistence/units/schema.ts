import type { StateSchema } from '../versioned-state';
export interface UnitIdentity { name: string; id: string }
export interface UnitRoster { units: UnitIdentity[] }
function validIdentity(value: unknown): value is UnitIdentity {
  if (!value || typeof value !== 'object') return false;
  const unit = value as Partial<UnitIdentity>;
  return typeof unit.name === 'string' && unit.name.length > 0
    && typeof unit.id === 'string' && unit.id.length > 0;
}
export const unitRosterSchema: StateSchema<UnitRoster> = {
  owner: 'units', version: 1, initial: () => ({ units: [] }), migrations: {},
  valid(value: unknown): value is UnitRoster {
    if (!value || typeof value !== 'object' || !('units' in value)) return false;
    return Array.isArray(value.units) && value.units.every(validIdentity)
      && new Set(value.units.map(unit => unit.name)).size === value.units.length
      && new Set(value.units.map(unit => unit.id)).size === value.units.length;
  },
};
