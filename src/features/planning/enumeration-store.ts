import { copyPlain } from '../../persistence/plain-data';
import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import type { CompactEnumerationRecord } from './enumeration-schema';
import type { CompactEnumeration } from './compact-enumeration';
import { enumerationSchema } from './enumeration-schema';
import { compactEnumeration, expandEnumeration } from './compact-enumeration';
import type { EnumerationCheckpoint } from './candidate-enumeration';
export interface EnumerationRecord { room: string; revision: number; checkpoint?: EnumerationCheckpoint }
export function createEnumerationStore(port: StatePort, room: string) {
  const key = stateKey('planning-candidates', room), schema = enumerationSchema(room);
  function write(expectedRevision: number, checkpoint?: CompactEnumeration) {
    const current = openState(port, key, schema);
    if (current.revision !== expectedRevision) return { ok: false as const, reason: 'revision' as const };
    if (checkpoint && current.checkpoint && checkpoint.signature !== current.checkpoint.signature) {
      return { ok: false as const, reason: 'identity' as const };
    }
    const record: CompactEnumerationRecord = { room, revision: current.revision + 1, ...(checkpoint ? { checkpoint } : {}) };
    saveState(port, key, schema, record);
    return { ok: true as const, record: copyPlain(record) };
  }
  return { read: () => expandRecord(openState(port, key, schema)),
    readCompact: () => openState(port, key, schema),
    saveCompact: (revision: number, checkpoint: CompactEnumeration) => write(revision, checkpoint),
    save(revision: number, checkpoint: EnumerationCheckpoint) {
      const result = write(revision, compactEnumeration(checkpoint));
      return result.ok ? { ...result, record: expandRecord(result.record) } : result;
    },
    clear: (revision: number) => write(revision) };
}
function expandRecord(record: CompactEnumerationRecord): EnumerationRecord {
  return { room: record.room, revision: record.revision,
    ...(record.checkpoint ? { checkpoint: expandEnumeration(record.checkpoint) } : {}) };
}