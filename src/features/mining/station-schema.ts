import type { StateSchema } from '../../persistence/versioned-state';
import { validateStation } from '../../capabilities/mining/station';
import type { MiningStation } from '../../capabilities/mining/station';
export interface StationRecord { lastSeen: number | null; stations: MiningStation[] }
function validStation(value: unknown, room: string, tick: number | null): boolean {
  try {
    const station = value as MiningStation;
    validateStation(station);
    return station.position.room === room && station.observedAt === tick;
  } catch { return false; }
}
function validTimestamp(record: StationRecord): boolean {
  if (record.lastSeen === null) return record.stations.length === 0;
  return Number.isSafeInteger(record.lastSeen) && record.lastSeen >= 0;
}
export function stationSchema(room: string): StateSchema<StationRecord> {
  return {
    owner: 'mining', version: 1, initial: () => ({ lastSeen: null, stations: [] }), migrations: {},
    valid(value: unknown): value is StationRecord {
      if (!value || typeof value !== 'object') return false;
      const record = value as StationRecord;
      if (!Array.isArray(record.stations) || record.stations.length > 32) return false;
      if (!validTimestamp(record)) return false;
      if (!record.stations.every(station => validStation(station, room, record.lastSeen))) return false;
      return new Set(record.stations.map(station => station.id)).size === record.stations.length
        && new Set(record.stations.map(station => station.target)).size === record.stations.length;
    },
  };
}

