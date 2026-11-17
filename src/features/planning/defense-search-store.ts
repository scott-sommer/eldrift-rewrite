import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { copyPlain } from '../../persistence/plain-data';
import type { TerrainDefenseCheckpoint } from './terrain-defense-request';
interface DefenseSearchRecord { room: string; revision: number; checkpoint?: TerrainDefenseCheckpoint }
export function createDefenseSearchStore(port: StatePort, room: string) {
  const key = stateKey('defense-search', room), schema = searchSchema(room);
  function save(expectedRevision: number, checkpoint?: TerrainDefenseCheckpoint) {
    const current = openState(port, key, schema);
    if (current.revision !== expectedRevision) return { ok: false as const, reason: 'revision' as const };
    const record = { room, revision: current.revision + 1, ...(checkpoint ? { checkpoint } : {}) };
    saveState(port, key, schema, record);
    return { ok: true as const, record: copyPlain(record) };
  }
  return { read: () => openState(port, key, schema), save,
    clear: (expectedRevision: number) => save(expectedRevision) };
}
function searchSchema(room: string): StateSchema<DefenseSearchRecord> {
  return { owner: 'defense-search', version: 1, migrations: {}, initial: () => ({ room, revision: 0 }),
    valid(value: unknown): value is DefenseSearchRecord {
      if (!value || typeof value !== 'object') return false;
      const record = value as DefenseSearchRecord;
      return record.room === room && integer(record.revision) && validCheckpoint(record.checkpoint);
    } };
}
function validCheckpoint(checkpoint: TerrainDefenseCheckpoint | undefined): boolean {
  if (checkpoint === undefined) return true;
  if (!checkpoint || checkpoint.version !== 1 || !text(checkpoint.identity)) return false;
  const flow = checkpoint.flow;
  if (flow === undefined) return true;
  return !!flow && flow.version === 1 && text(flow.signature) && integer(flow.augmentations) && flow.augmentations <= 1000000;
}
function integer(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
function text(value: string): boolean { return typeof value === 'string' && value.length > 0; }
