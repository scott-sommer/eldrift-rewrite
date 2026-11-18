import { openState, peekState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { copyPlain } from '../../persistence/plain-data';
import { stateKey } from '../../persistence/state-key';
import { roomCoordinates } from '../../core/geometry/room-grid';
import { intelSchema, validIntelFailure, validLegacyIntel, summaryHostiles } from './schema';
import { validRoomSummary } from './summary-validation';
import { intelReadModel, requireIntelClock } from './freshness';
import type { IntelFailure, IntelRecord, LegacyIntelRecord, RoomSummary } from './model';
export function createIntelStore(port: StatePort) {
  const key = (room: string) => { roomCoordinates(room); return stateKey('intel', room); };
  const read = (room: string) => openState(port, key(room), intelSchema(room));
  const save = (room: string, record: IntelRecord) => saveState(port, key(room), intelSchema(room), record);
  return {
    /** Missing rooms remain unknown without creating a persistent record. */
    peek(room: string, tick: number, maximumAge = 5000) {
      requireIntelClock(tick, maximumAge);
      const schema = intelSchema(room);
      return intelReadModel(peekState(port, key(room), schema) ?? schema.initial(), tick, maximumAge);
    },
    read(room: string, tick: number, maximumAge = 5000) {
      requireIntelClock(tick, maximumAge);
      return intelReadModel(read(room), tick, maximumAge);
    },
    /** ID-only compatibility updates retain detailed facts with their own original timestamp. */
    observe(room: string, value: LegacyIntelRecord): void {
      const snapshot = copyPlain(value);
      if (!validLegacyIntel(snapshot) || snapshot.lastSeen === null) throw new Error('Observation requires valid facts and a tick');
      const { lastSeen, owned, sourceIds, structureIds, hostileIds } = snapshot;
      const record = read(room);
      requireNewObservation(record, lastSeen);
      save(room, { ...record, lastSeen, owned, sourceIds: [...new Set(sourceIds)],
        structureIds: [...new Set(structureIds)], hostileIds: [...new Set(hostileIds)] });
    },
    observeSummary(value: RoomSummary, visited = false): void {
      const summary = copyPlain(value);
      if (!validRoomSummary(summary) || typeof visited !== 'boolean') throw new Error('Invalid room summary');
      const record = read(summary.room);
      requireNewObservation(record, summary.observedAt);
      save(summary.room, { ...record, lastSeen: summary.observedAt, owned: summary.controller?.owned ?? false,
        sourceIds: summary.sources.map(item => item.id), structureIds: summary.structures.map(item => item.id),
        hostileIds: summaryHostiles(summary), summary, lastVisit: visited ? summary.observedAt : record.lastVisit });
    },
    recordFailure(room: string, value: IntelFailure): boolean {
      const failure = copyPlain(value);
      if (!validIntelFailure(failure)) throw new Error('Invalid intel failure');
      const record = read(room), previous = record.lastFailure;
      if (previous?.id === failure.id) {
        if (previous.tick !== failure.tick || previous.reason !== failure.reason) throw new Error('Conflicting intel failure identity');
        return false;
      }
      if (previous && failure.tick <= previous.tick) return false;
      save(room, { ...record, lastFailure: failure });
      return true;
    },
  };
}
function requireNewObservation(record: IntelRecord, tick: number): void {
  if (record.lastSeen !== null && tick < record.lastSeen) throw new Error('Observation is older than stored intel');
}
