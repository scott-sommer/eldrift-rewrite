import type { StateSchema } from '../../persistence/versioned-state';
import { integer } from './plan-model';
import { compactEnumeration, validCompactEnumeration } from './compact-enumeration';
import type { CompactEnumeration } from './compact-enumeration';
import type { EnumerationCheckpoint } from './candidate-enumeration';
export interface CompactEnumerationRecord { room: string; revision: number; checkpoint?: CompactEnumeration }
export function enumerationSchema(room: string): StateSchema<CompactEnumerationRecord> {
  return { owner: 'planning-candidates', version: 2,
    migrations: { 1: value => migrate(value, room) },
    initial: () => ({ room, revision: 0 }),
    valid(value: unknown): value is CompactEnumerationRecord {
      if (!validHeader(value, room)) return false;
      return value.checkpoint === undefined || validCompactEnumeration(value.checkpoint);
    } };
}
function validHeader(value: unknown, room: string): value is CompactEnumerationRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as CompactEnumerationRecord;
  return record.room === room && integer(record.revision, 0, Number.MAX_SAFE_INTEGER);
}
function migrate(value: unknown, room: string): CompactEnumerationRecord {
  if (!validHeader(value, room)) throw new Error('invalid state data: enumeration migration');
  const checkpoint = (value as unknown as { checkpoint?: EnumerationCheckpoint }).checkpoint;
  return { room, revision: value.revision, ...(checkpoint !== undefined ? { checkpoint: compactEnumeration(checkpoint) } : {}) };
}
