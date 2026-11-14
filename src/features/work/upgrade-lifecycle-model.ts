import type { StateSchema } from '../../persistence/versioned-state';
export interface UpgradeController { id: string; ownership: 'own' | 'neutral' | 'foreign'; level: number; reservedByOther: boolean }
export interface UpgradeLifecycleView {
  tick: number; controller?: UpgradeController; claimer?: { id: string; ready: boolean };
  freeGcl: boolean; sponsorReady: boolean; fleetActive: boolean;
}
export interface UpgradeLifecyclePolicy { enabled: boolean; cycleAtRcl8: boolean }
export interface UpgradeControllerCommand { kind: 'unclaim' | 'claim'; controller: string; claimer: string }
export interface UpgradeLifecycleState {
  controller: string | null; releaseObserved: boolean; cycles: number; lastTick: number;
  attempt: (UpgradeControllerCommand & { tick: number }) | null;
}
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
function validAttempt(value: UpgradeLifecycleState['attempt']): boolean {
  return value === null || !!value && (value.kind === 'unclaim' || value.kind === 'claim')
    && nonempty(value.controller) && nonempty(value.claimer) && Number.isSafeInteger(value.tick) && value.tick >= 0;
}
export const upgradeLifecycleSchema: StateSchema<UpgradeLifecycleState> = {
  owner: 'upgrade-lifecycle', version: 1, migrations: {},
  initial: () => ({ controller: null, releaseObserved: false, cycles: 0, lastTick: -1, attempt: null }),
  valid(value: unknown): value is UpgradeLifecycleState {
    if (!value || typeof value !== 'object') return false;
    const state = value as UpgradeLifecycleState;
    return (state.controller === null || nonempty(state.controller)) && typeof state.releaseObserved === 'boolean'
      && validCounters(state) && validAttempt(state.attempt) && coherentAttempt(state);
  },
};

function validCounters(state: UpgradeLifecycleState): boolean {
  return Number.isSafeInteger(state.cycles) && state.cycles >= 0 && Number.isSafeInteger(state.lastTick) && state.lastTick >= -1;
}
function coherentAttempt(state: UpgradeLifecycleState): boolean {
  if (state.releaseObserved && !state.controller) return false;
  return !state.attempt || state.attempt.controller === state.controller && state.attempt.tick <= state.lastTick;
}
