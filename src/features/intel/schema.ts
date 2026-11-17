import { roomCoordinates } from '../../core/geometry/room-grid';
import type { StateSchema } from '../../persistence/versioned-state';
import { validRoomSummary } from './summary-validation';
import { object, ids, natural, text, tickOrNull, sameIds } from './validation';
import type { IntelRecord, LegacyIntelRecord, IntelFailure } from './model';
export type { IntelRecord } from './model';
function legacy(value: unknown): value is LegacyIntelRecord {
  return object(value) && tickOrNull(value.lastSeen) && typeof value.owned === 'boolean'
    && ids(value.sourceIds) && ids(value.structureIds) && ids(value.hostileIds);
}
export function validIntelFailure(value: unknown): value is IntelFailure {
  return object(value) && text(value.id) && natural(value.tick) && text(value.reason);
}
function valid(value: unknown): value is IntelRecord {
  if (!legacy(value)) return false;
  const record = value as IntelRecord;
  return uniqueIndexes(record) && validSummaryState(record) && validVisit(record)
    && (record.lastFailure === null || validIntelFailure(record.lastFailure));
}
function uniqueIndexes(record: LegacyIntelRecord): boolean {
  return [record.sourceIds, record.structureIds, record.hostileIds].every(values => new Set(values).size === values.length);
}
function validSummaryState(record: IntelRecord): boolean {
  if (record.summary === null) return true;
  if (!validRoomSummary(record.summary) || record.lastSeen === null || record.summary.observedAt > record.lastSeen) return false;
  return record.summary.observedAt !== record.lastSeen || matchingIndexes(record);
}
function matchingIndexes(record: IntelRecord): boolean {
  const summary = record.summary!;
  return record.owned === (summary.controller?.owned ?? false) && sameIds(record.sourceIds, summary.sources.map(item => item.id))
    && sameIds(record.structureIds, summary.structures.map(item => item.id)) && sameIds(record.hostileIds, summaryHostiles(summary));
}
export function summaryHostiles(summary: NonNullable<IntelRecord['summary']>): string[] {
  return [...summary.units.filter(unit => !unit.owned), ...summary.structures.filter(structure => structure.hostile)].map(item => item.id);
}
function validVisit(record: IntelRecord): boolean {
  return tickOrNull(record.lastVisit) && (record.lastVisit === null || record.lastSeen !== null && record.lastVisit <= record.lastSeen);
}
function migrate(value: unknown): IntelRecord {
  if (!legacy(value)) throw new Error('Invalid legacy intel');
  return { ...value, sourceIds: [...new Set(value.sourceIds)], structureIds: [...new Set(value.structureIds)],
    hostileIds: [...new Set(value.hostileIds)], summary: null, lastVisit: null, lastFailure: null };
}
export function intelSchema(room: string): StateSchema<IntelRecord> {
  roomCoordinates(room);
  return {
    owner: 'intel', version: 2,
    valid: (value: unknown): value is IntelRecord => valid(value) && (value.summary === null || value.summary.room === room),
    migrations: { 1: migrate },
    initial: () => ({ lastSeen: null, owned: false, sourceIds: [], structureIds: [], hostileIds: [],
      summary: null, lastVisit: null, lastFailure: null }),
  };
}
