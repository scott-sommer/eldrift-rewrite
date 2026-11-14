import type { StatePort } from '../../persistence/versioned-state';
import { openState, saveState } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import type { RecoveryRoom, RecoveryDonor } from '../../capabilities/recovery/assessment';
import type { RecoveryState } from './schema';
import { initialRecovery, recoverySchema } from './schema';
import { assessRecovery, recoveryEligible, validateRecoveryPolicy } from './policy';
import type { RecoveryPolicy } from './policy';
/** Initial/configuration changes evaluate immediately; subsequent assessments use persisted cadence. */
export function refreshRecovery(state: StatePort, room: RecoveryRoom, observeDonors: () => readonly RecoveryDonor[],
  policy: RecoveryPolicy, enabled: boolean, tick: number) {
  validateRecoveryPolicy(policy);
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid recovery tick');
  const key = stateKey('recovery', room.room);
  if (!enabled && state.read(key) === undefined) return initialRecovery(room.room);
  const schema = recoverySchema(room.room);
  const previous = openState(state, key, schema);
  const policyKey = JSON.stringify([enabled, policy]);
  const eligible = enabled && recoveryEligible(room, policy);
  if (!assessmentDue(previous, policyKey, eligible, tick, policy.interval)) return previous;
  const decision = eligible ? assessRecovery(room, previous.active, observeDonors(), policy) : { active: false, donors: [] };
  const next = { room: room.room, checkedAt: tick, energy: room.energy, policyKey, ...decision };
  saveState(state, key, schema, next);
  return next;
}

function assessmentDue(previous: RecoveryState, policyKey: string, eligible: boolean, tick: number, interval: number): boolean {
  return previous.active && !eligible || previous.policyKey !== policyKey || tick >= previous.checkedAt + interval;
}
