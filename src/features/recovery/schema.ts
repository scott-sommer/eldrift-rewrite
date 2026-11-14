import type { RecoverySupport } from '../../capabilities/recovery/assessment';
import type { StateSchema } from '../../persistence/versioned-state';
export interface RecoveryState { room: string; active: boolean; checkedAt: number; energy: number; policyKey: string; donors: RecoverySupport[] }
export function initialRecovery(room: string): RecoveryState { return { room, active: false, checkedAt: -1, energy: 0, policyKey: '', donors: [] }; }
export function recoverySchema(room: string): StateSchema<RecoveryState> {
  return { owner: 'recovery', version: 1, initial: () => initialRecovery(room), migrations: {},
    valid(value: unknown): value is RecoveryState {
      if (!value || typeof value !== 'object') return false;
      const state = value as RecoveryState;
      return state.room === room && typeof state.active === 'boolean' && typeof state.policyKey === 'string'
        && validObservation(state)
        && validDonors(state.donors, room) && (state.active || state.donors.length === 0);
    } };
}
function validDonors(donors: RecoverySupport[], room: string): boolean {
  return Array.isArray(donors) && donors.length <= 100 && donors.every(donor => donor && typeof donor.room === 'string'
    && donor.room.length > 0 && donor.room !== room && Number.isSafeInteger(donor.distance) && donor.distance >= 0
    && Number.isSafeInteger(donor.requestedEnergy) && donor.requestedEnergy > 0)
    && new Set(donors.map(donor => donor.room)).size === donors.length;
}

function validObservation(state: RecoveryState): boolean {
  return Number.isSafeInteger(state.checkedAt) && state.checkedAt >= -1 && Number.isSafeInteger(state.energy) && state.energy >= 0;
}
