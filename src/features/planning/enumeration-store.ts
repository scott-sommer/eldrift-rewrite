import { copyPlain } from '../../persistence/plain-data';
import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { integer } from './plan-model';
import { validEnumeration } from './enumeration-state';
import type { EnumerationCheckpoint } from './candidate-enumeration';
export interface EnumerationRecord { room: string; revision: number; checkpoint?: EnumerationCheckpoint }
export function createEnumerationStore(port: StatePort, room: string) {
  const key = stateKey('planning-candidates', room), schema = enumerationSchema(room);
  function write(expectedRevision: number, checkpoint?: EnumerationCheckpoint) {
    const current = openState(port, key, schema);
    if (current.revision !== expectedRevision) return { ok: false as const, reason: 'revision' as const };
    if (checkpoint && current.checkpoint && checkpoint.signature !== current.checkpoint.signature) {
      return { ok: false as const, reason: 'identity' as const };
    }
    const record: EnumerationRecord = { room, revision: current.revision + 1, ...(checkpoint ? { checkpoint } : {}) };
    saveState(port, key, schema, record);
    return { ok: true as const, record: copyPlain(record) };
  }
  return { read: () => openState(port, key, schema),
    save: (revision: number, checkpoint: EnumerationCheckpoint) => write(revision, checkpoint),
    clear: (revision: number) => write(revision) };
}
function enumerationSchema(room: string): StateSchema<EnumerationRecord> {
  return { owner: 'planning-candidates', version: 1, migrations: {},
    initial: () => ({ room, revision: 0 }),
    valid(value: unknown): value is EnumerationRecord {
      if (!value || typeof value !== 'object') return false;
      const record = value as EnumerationRecord;
      return record.room === room && integer(record.revision, 0, Number.MAX_SAFE_INTEGER)
        && (record.checkpoint === undefined || validEnumeration(record.checkpoint));
    } };
}
