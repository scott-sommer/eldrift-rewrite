import { openState, peekState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { confirmTransfer, validateTransferAttempt } from '../../capabilities/logistics/confirmation';
import type { TransferAttempt, TransferObservation, TransferConfirmation } from '../../capabilities/logistics/confirmation';
export interface Journal { acknowledged: boolean; attempt: TransferAttempt | null; result: TransferConfirmation | null }
export const schema: StateSchema<Journal> = {
  owner: 'logistics', version: 1, initial: () => ({ acknowledged: true, attempt: null, result: null }), migrations: {}, valid,
};
/** Begin persists before invocation. Pending or unretired unknown evidence cannot be overwritten. */
export function createTransferJournal(port: StatePort, unit: string) {
  const key = stateKey('logistics-attempts', unit);
  const read = () => openState(port, key, schema);
  return {
    read,
    peek: () => peekState(port,key,schema),
    begin(attempt: TransferAttempt): boolean {
      validateTransferAttempt(attempt);
      if (attempt.unit !== unit) throw new Error('Transfer journal unit mismatch');
      const previous = read();
      if (previous.attempt && (!previous.acknowledged || previous.attempt.tick >= attempt.tick || previous.result?.status === 'unknown')) return false;
      saveState(port, key, schema, { acknowledged: false, attempt, result: null });
      return true;
    },
    retireUnknown(id: string): void {
      const current = read();
      if (current.attempt?.id !== id || !current.acknowledged || current.result?.status !== 'unknown') throw new Error('Unknown transfer is not ready to retire');
      saveState(port, key, schema, schema.initial());
    },
    acknowledge(id: string): void {
      const state = read();
      if (state.attempt?.id !== id || !state.result) throw new Error('Transfer result is not ready to acknowledge');
      saveState(port, key, schema, { ...state, acknowledged: true });
    },
    settle(observation: TransferObservation): TransferConfirmation | null {
      const state = read();
      if (!state.attempt || state.result) return state.result;
      const result = confirmTransfer(state.attempt, observation);
      if (result.status !== 'waiting') saveState(port, key, schema, { ...state, result });
      return result;
    },
  };
}
function valid(value: unknown): value is Journal {
  if (!value || typeof value !== 'object') return false;
  const record = value as Journal;
  if (typeof record.acknowledged !== 'boolean') return false;
  if (record.attempt === null) return record.result === null && record.acknowledged;
  try { validateTransferAttempt(record.attempt); } catch { return false; }
  return validResult(record.result, record.attempt.amount) && (!record.acknowledged || record.result !== null);
}
function validResult(result: TransferConfirmation | null, maximum: number): boolean {
  if (result === null) return true;
  if (!result || typeof result !== 'object') return false;
  return result.status === 'unknown' || (result.status === 'observed'
    && Number.isSafeInteger(result.amount) && result.amount >= 0 && result.amount <= maximum);
}


