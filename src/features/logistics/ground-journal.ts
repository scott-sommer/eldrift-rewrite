import { openState, saveState, type StatePort, type StateSchema } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { confirmGroundRelease, validateGroundAttempt, type GroundAttempt, type GroundObservation, type GroundConfirmation } from '../../capabilities/logistics/ground-confirmation';
export type GroundResult = GroundConfirmation | { status: 'rejected'; code: number } | { status: 'reconciled'; tick: number; cargo: number };
interface GroundJournal { attempt: GroundAttempt | null; result: GroundResult | null; acknowledged: boolean }
const schema: StateSchema<GroundJournal> = {
  owner: 'ground-delivery', version: 1, migrations: {},
  initial: () => ({ attempt: null, result: null, acknowledged: true }), valid,
};
export function createGroundJournal(port: StatePort, unit: string) {
  const key = stateKey('ground-delivery', unit);
  const read = () => openState(port, key, schema);
  return {
    read,
    begin(attempt: GroundAttempt): boolean {
      validateGroundAttempt(attempt);
      if (attempt.unit !== unit) throw new Error('Ground journal unit mismatch');
      const previous = read();
      if (previous.result?.status === 'reconciled' && previous.result.tick >= attempt.tick) return false;
      if (previous.attempt && (!previous.acknowledged || previous.attempt.tick >= attempt.tick)) return false;
      saveState(port, key, schema, { attempt, result: null, acknowledged: false });
      return true;
    },
    reject(id: string, code: number): void {
      const current = read();
      if (current.attempt?.id !== id || current.result || !Number.isSafeInteger(code) || code >= 0) throw new Error('Invalid ground rejection');
      saveState(port, key, schema, { ...current, result: { status: 'rejected', code }, acknowledged: true });
    },
    settle(observation: GroundObservation, decayDivisor: number): GroundResult | null {
      const current = read();
      if (!current.attempt || current.result) return current.result;
      const result = confirmGroundRelease(current.attempt, observation, decayDivisor);
      if (result.status !== 'waiting') saveState(port, key, schema, { ...current, result });
      return result;
    },
    reconcileUnknown(id: string, observation: { unit: string; tick: number; cargo: number }): void {
      const current = read();
      if (current.attempt?.id !== id || current.result?.status !== 'unknown') throw new Error('Ground result is not unknown');
      if (observation.unit !== unit || !Number.isSafeInteger(observation.tick) || observation.tick <= current.attempt.tick
        || !Number.isSafeInteger(observation.cargo) || observation.cargo < 0) throw new Error('Invalid ground recovery observation');
      saveState(port, key, schema, { ...current, result: { status: 'reconciled', tick: observation.tick, cargo: observation.cargo }, acknowledged: true });
    },
    acknowledge(id: string): void {
      const current = read();
      if (current.attempt?.id !== id || current.result?.status !== 'released') throw new Error('Ground release is not confirmed');
      saveState(port, key, schema, { ...current, acknowledged: true });
    },
  };
}
function valid(value: unknown): value is GroundJournal {
  if (!value || typeof value !== 'object') return false;
  const journal = value as GroundJournal;
  if (typeof journal.acknowledged !== 'boolean') return false;
  if (journal.attempt === null) return journal.result === null && journal.acknowledged;
  try { validateGroundAttempt(journal.attempt); } catch { return false; }
  return validResult(journal.result, journal.attempt.amount) && (!journal.acknowledged || acknowledgeable(journal.result));
}
function validResult(result: GroundResult | null, amount: number): boolean {
  if (result === null) return true;
  if (result?.status === 'reconciled') return [result.tick, result.cargo].every(value => Number.isSafeInteger(value) && value >= 0);
  if (result?.status === 'rejected') return Number.isSafeInteger(result.code) && result.code < 0;
  return !!result && (result.status === 'unknown' || result.status === 'released' && result.amount === amount);
}

function acknowledgeable(result: GroundResult | null): boolean {
  return !!result && ['released', 'rejected', 'reconciled'].includes(result.status);
}
