import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
interface FleetGate { active: boolean }
const schema: StateSchema<FleetGate> = {
  owner: 'upgrade-fleet', version: 1, initial: () => ({ active: false }), migrations: {},
  valid: (value: unknown): value is FleetGate => !!value && typeof value === 'object' && 'active' in value && typeof value.active === 'boolean',
};
/** Legacy spawning hysteresis: strict entry/exit, with equality preserving the previous decision. */
export function refreshUpgradeFleetGate(state: StatePort, target: string, energy: number, start: number, stop: number): boolean {
  if (![energy, start, stop].every(value => Number.isSafeInteger(value) && value >= 0) || stop >= start) throw new Error('Invalid upgrade fleet thresholds');
  const key = stateKey('upgrade-fleet', target);
  const previous = openState(state, key, schema);
  const active = energy > start ? true : energy < stop ? false : previous.active;
  if (active !== previous.active) saveState(state, key, schema, { active });
  return active;
}
