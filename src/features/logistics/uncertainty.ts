import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { validateTransferAttempt } from '../../capabilities/logistics/confirmation';
import type { TransferAttempt } from '../../capabilities/logistics/confirmation';
import { validateLogisticsRequest } from '../../capabilities/logistics/request';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
export interface UncertainTransfer { attempt: TransferAttempt; request: LogisticsRequest; home: string; scope: string; tick: number; cargo: number | null }
interface Incidents { entries: UncertainTransfer[]; discarded: number }
/** Retain ten detailed incidents per unit plus an explicit count of older discarded details. */
export function recordUncertainTransfer(state: StatePort, incident: UncertainTransfer): void {
  const key = stateKey('logistics-uncertainty', incident.attempt.unit);
  const record = openState(state, key, schema);
  const previous = record.entries.find(item => item.attempt.id === incident.attempt.id);
  if (previous) {
    if (JSON.stringify(previous.attempt) !== JSON.stringify(incident.attempt)) throw new Error('Uncertain attempt identity conflict');
    return;
  }
  record.entries.push(incident);
  if (record.entries.length > 10) { record.entries.shift(); record.discarded++; }
  saveState(state, key, schema, record);
}
function validIncident(value: unknown): value is UncertainTransfer {
  if (!value || typeof value !== 'object') return false;
  const item = value as UncertainTransfer;
  try { validateTransferAttempt(item.attempt); validateLogisticsRequest(item.request); } catch { return false; }
  return [item.home, item.scope].every(nonempty) && nonnegative(item.tick) && item.tick >= item.attempt.tick
    && (item.cargo === null || nonnegative(item.cargo));
}
const schema: StateSchema<Incidents> = {
  owner: 'logistics', version: 1, initial: () => ({ entries: [], discarded: 0 }), migrations: {},
  valid(value: unknown): value is Incidents {
    if (!value || typeof value !== 'object') return false;
    const record = value as Incidents;
    return Number.isSafeInteger(record.discarded) && record.discarded >= 0 && Array.isArray(record.entries)
      && record.entries.length <= 10 && record.entries.every(validIncident)
      && new Set(record.entries.map(item => item.attempt.id)).size === record.entries.length;
  },
};

function nonempty(value: unknown): boolean { return typeof value === 'string' && value.length > 0; }
function nonnegative(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }

