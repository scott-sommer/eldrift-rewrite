import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { roomCoordinates } from '../../../core/geometry/room-grid';
import { spawnLoadWindow } from './model';
import type { SpawnLoadRecord, SpawnLoadSegment } from './model';
import { sampleSpawnLoad, reportSpawnLoad } from './window';
import type { SpawnLoadSample } from './model';
export function createSpawnLoadStore(state: StatePort, home: string) {
  roomCoordinates(home);
  const key = stateKey('spawnLoad',home), schema = loadSchema(home), read = () => peekState(state,key,schema) ?? schema.initial();
  return { read,report: (tick: number,count: number) => reportSpawnLoad(read().segments,tick,count),
    sample(tick: number, sample: SpawnLoadSample): boolean {
      const current = read();
      if (tick < current.clock || current.segments.at(-1)?.to === tick+1) return false;
      const next = { home,clock: tick,revision: current.revision+1,segments: sampleSpawnLoad(current.segments,tick,sample) };
      if (!schema.valid(next)) throw new Error('Invalid spawn-load transition');
      if (read().revision !== current.revision) return false;
      openState(state,key,schema); saveState(state,key,schema,next); return true;
    } };
}
function loadSchema(home: string): StateSchema<SpawnLoadRecord> {
  return { owner: 'population',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,segments: [] }),
    valid(value: unknown): value is SpawnLoadRecord {
      if (!value || typeof value !== 'object') return false;
      const record = value as SpawnLoadRecord;
      return record.home === home && natural(record.revision) && natural(record.clock) && validSegments(record);
    } };
}
function natural(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
function validSegments(record: SpawnLoadRecord): boolean {
  if (!Array.isArray(record.segments) || record.segments.length > spawnLoadWindow) return false;
  let end = 0;
  for (const segment of record.segments) {
    if (!validSegment(segment,record.clock) || segment.from < end) return false;
    end = segment.to;
  }
  return record.segments.length ? end === record.clock+1 : record.revision === 0 && record.clock === 0;
}
function validSegment(value: SpawnLoadSegment, clock: number): boolean {
  return !!value && [value.from,value.to,value.busy,value.starved,value.spawns].every(natural) && value.from < value.to
    && value.from >= Math.max(0,clock-spawnLoadWindow+1) && value.to <= clock+1 && value.spawns <= 3 && value.busy+value.starved <= value.spawns;
}
